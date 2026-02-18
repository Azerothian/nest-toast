import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { ToastModule, OnChainEvent, Plugin } from '@azerothian/toast';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ToastBpmnModule } from '../../toast-bpmn.module';
import { BpmnLoaderService } from '../../services/bpmn-loader.service';
import { BpmnExecutorService } from '../../services/bpmn-executor.service';
import { BpmnContextService } from '../../services/bpmn-context.service';
import { OnProcessStart, OnProcessComplete, OnProcessError } from '../../decorators/lifecycle.decorators';
import { BpmnContext } from '../../decorators/bpmn-context.decorator';
import { BpmnExecutionError } from '../../errors/bpmn-execution.error';

const FIXTURES_DIR = join(__dirname, '../../../test/fixtures');
const simpleProcessXml = readFileSync(join(FIXTURES_DIR, 'simple-process.bpmn'), 'utf-8');
const gatewayProcessXml = readFileSync(join(FIXTURES_DIR, 'exclusive-gateway.bpmn'), 'utf-8');

// --- Lifecycle hook test handlers ---

const lifecycleCallLog: string[] = [];

@Injectable()
@Plugin({ name: 'lifecycle-hooks-handler', version: '1.0.0' })
class LifecycleHooksHandler {
  @OnChainEvent<Record<string, unknown>>('simple.validate')
  async validate(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, validated: true };
  }

  @OnChainEvent<Record<string, unknown>>('simple.process')
  async process(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, processed: true };
  }

  @OnProcessStart()
  async onStart(payload: Record<string, unknown>): Promise<void> {
    lifecycleCallLog.push(`start:${payload.processName}`);
  }

  @OnProcessComplete()
  async onComplete(payload: Record<string, unknown>): Promise<void> {
    lifecycleCallLog.push(`complete:${payload.processName}`);
  }

  @OnProcessError()
  async onError(payload: Record<string, unknown>): Promise<void> {
    lifecycleCallLog.push(`error:${payload.processName}`);
  }
}

// --- Context injection test handler ---

@Injectable()
@Plugin({ name: 'context-injection-handler', version: '1.0.0' })
class ContextInjectionHandler {
  @OnChainEvent<Record<string, unknown>>('simple.validate')
  async validate(
    input: Record<string, unknown>,
    @BpmnContext() ctx: any,
  ): Promise<Record<string, unknown>> {
    return { ...input, hasContext: !!ctx, processId: ctx?.processId };
  }

  @OnChainEvent<Record<string, unknown>>('simple.process')
  async process(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, processed: true };
  }
}

// --- Gateway test handlers ---

@Injectable()
@Plugin({ name: 'gateway-high-handler', version: '1.0.0' })
class GatewayHighHandler {
  @OnChainEvent<Record<string, unknown>>('gateway.high')
  async handle(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, route: 'high' };
  }
}

@Injectable()
@Plugin({ name: 'gateway-low-handler', version: '1.0.0' })
class GatewayLowHandler {
  @OnChainEvent<Record<string, unknown>>('gateway.low')
  async handle(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, route: 'low' };
  }
}

// --- Failing handler for error lifecycle ---

@Injectable()
@Plugin({ name: 'failing-lifecycle-handler', version: '1.0.0' })
class FailingLifecycleHandler {
  @OnChainEvent<Record<string, unknown>>('simple.validate')
  async validate(_input: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('Intentional failure for lifecycle test');
  }

  @OnProcessError()
  async onError(payload: Record<string, unknown>): Promise<void> {
    lifecycleCallLog.push(`error:${payload.processName}`);
  }
}

// =============================================================================
// TC-P-002: Lifecycle hooks
// =============================================================================

describe('TC-P-002: Lifecycle hooks invocation', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    lifecycleCallLog.length = 0;
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [LifecycleHooksHandler],
    }).compile();
    await moduleRef.init();
    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    await loader.loadFromString(simpleProcessXml);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('@OnProcessStart is called before execution', async () => {
    await executor.execute('SimpleProcess', { x: 1 });
    expect(lifecycleCallLog).toContain('start:SimpleProcess');
  });

  it('@OnProcessComplete is called after successful execution', async () => {
    await executor.execute('SimpleProcess', { x: 1 });
    expect(lifecycleCallLog).toContain('complete:SimpleProcess');
  });

  it('lifecycle hooks are called in correct order: start then complete', async () => {
    await executor.execute('SimpleProcess', { x: 1 });
    const startIdx = lifecycleCallLog.indexOf('start:SimpleProcess');
    const completeIdx = lifecycleCallLog.indexOf('complete:SimpleProcess');
    expect(startIdx).toBeLessThan(completeIdx);
  });
});

describe('TC-P-002b: @OnProcessError lifecycle hook', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    lifecycleCallLog.length = 0;
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [FailingLifecycleHandler],
    }).compile();
    await moduleRef.init();
    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    await loader.loadFromString(simpleProcessXml);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('@OnProcessError is called when execution fails', async () => {
    await expect(executor.execute('SimpleProcess', { x: 1 })).rejects.toThrow();
    expect(lifecycleCallLog).toContain('error:SimpleProcess');
  });
});

// =============================================================================
// TC-P-005: @BpmnContext injection
// =============================================================================

describe('TC-P-005: @BpmnContext decorator injection', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [ContextInjectionHandler],
    }).compile();
    await moduleRef.init();
    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    await loader.loadFromString(simpleProcessXml);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('handler receives context via @BpmnContext parameter decorator', async () => {
    const result = await executor.execute<{ x: number }, Record<string, unknown>>('SimpleProcess', { x: 1 });
    expect(result.hasContext).toBe(true);
    expect(result.processId).toBeDefined();
    expect(typeof result.processId).toBe('string');
  });
});

// =============================================================================
// Gateway routing
// =============================================================================

describe('Gateway routing: exclusive gateway', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [GatewayHighHandler, GatewayLowHandler],
    }).compile();
    await moduleRef.init();
    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    await loader.loadFromString(gatewayProcessXml);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('loads gateway definition with gateways parsed', () => {
    const def = loader.getDefinition('GatewayProcess');
    expect(def).toBeDefined();
    expect(def!.gateways).toHaveLength(1);
    expect(def!.gateways[0].type).toBe('exclusive');
    expect(def!.gateways[0].id).toBe('GW_1');
  });

  it('routes to high-value branch when condition is true', async () => {
    const result = await executor.execute<{ amount: number }, Record<string, unknown>>(
      'GatewayProcess',
      { amount: 200 },
    );
    expect(result.route).toBe('high');
  });

  it('routes to default (low-value) branch when condition is false', async () => {
    const result = await executor.execute<{ amount: number }, Record<string, unknown>>(
      'GatewayProcess',
      { amount: 50 },
    );
    expect(result.route).toBe('low');
  });
});

// =============================================================================
// Timing collection
// =============================================================================

describe('Timing data collection', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [LifecycleHooksHandler],
    }).compile();
    await moduleRef.init();
    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    await loader.loadFromString(simpleProcessXml);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('getTiming returns timing data after execution', async () => {
    const emitter = moduleRef.get(EventEmitter2);
    let processId: string | undefined;
    emitter.on('bpmn.process.started', (p: { processId: string }) => {
      processId = p.processId;
    });

    await executor.execute('SimpleProcess', { x: 1 });

    expect(processId).toBeDefined();
    const timing = executor.getTiming(processId!);
    expect(timing).toBeDefined();
    expect(timing!.processName).toBe('SimpleProcess');
    expect(timing!.duration).toBeGreaterThanOrEqual(0);
    expect(timing!.totalDuration).toBeGreaterThanOrEqual(0);
    expect(timing!.executionTime).toBeGreaterThanOrEqual(0);
    expect(timing!.tasks).toHaveLength(2);
    expect(timing!.tasks[0].taskId).toBe('Task_Validate');
    expect(timing!.tasks[1].taskId).toBe('Task_Process');
  });

  it('getTiming returns undefined for unknown processId', () => {
    const timing = executor.getTiming('nonexistent');
    expect(timing).toBeUndefined();
  });
});

// =============================================================================
// getStatus returns ProcessStatusInfo
// =============================================================================

describe('getStatus returns ProcessStatusInfo object', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [LifecycleHooksHandler],
    }).compile();
    await moduleRef.init();
    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    await loader.loadFromString(simpleProcessXml);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('returns { status, currentStep } after execution', async () => {
    const emitter = moduleRef.get(EventEmitter2);
    let processId: string | undefined;
    emitter.on('bpmn.process.started', (p: { processId: string }) => {
      processId = p.processId;
    });

    await executor.execute('SimpleProcess', { x: 1 });

    const statusInfo = await executor.getStatus(processId!);
    expect(statusInfo).toBeDefined();
    expect(statusInfo!.status).toBe('completed');
    expect(typeof statusInfo!.currentStep).toBe('string');
  });
});

// =============================================================================
// Retry logic
// =============================================================================

describe('TC-P-004: Retry logic', () => {
  it('retries failed tasks according to retryPolicy', async () => {
    let callCount = 0;

    @Injectable()
    @Plugin({ name: 'retry-test-handler', version: '1.0.0' })
    class RetryTestHandler {
      @OnChainEvent<Record<string, unknown>>('simple.validate')
      async validate(input: Record<string, unknown>): Promise<Record<string, unknown>> {
        callCount++;
        if (callCount < 3) {
          throw new Error(`Attempt ${callCount} failed`);
        }
        return { ...input, validated: true, attempts: callCount };
      }

      @OnChainEvent<Record<string, unknown>>('simple.process')
      async process(input: Record<string, unknown>): Promise<Record<string, unknown>> {
        return { ...input, processed: true };
      }
    }

    // Create a process XML with retry policy
    const retryProcessXml = simpleProcessXml.replace(
      '<toast:ProcessConfig description="A simple two-task process" version="1.0.0" />',
      '<toast:ProcessConfig description="A simple two-task process" version="1.0.0" retryMaxRetries="3" retryBackoffMs="10" retryBackoffMultiplier="1" />',
    );

    const moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [RetryTestHandler],
    }).compile();
    await moduleRef.init();

    const loader = moduleRef.get(BpmnLoaderService);
    const executor = moduleRef.get(BpmnExecutorService);

    await loader.loadFromString(retryProcessXml);

    const result = await executor.execute<{ x: number }, Record<string, unknown>>('SimpleProcess', { x: 1 });

    expect(callCount).toBe(3);
    expect(result.validated).toBe(true);
    expect(result.attempts).toBe(3);

    await moduleRef.close();
  });
});

// =============================================================================
// Memory leak fix - activeProcesses cleanup
// =============================================================================

describe('Memory leak: activeProcesses cleanup', () => {
  it('getStatus still works immediately after execution (cleanup is delayed)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [LifecycleHooksHandler],
    }).compile();
    await moduleRef.init();

    const loader = moduleRef.get(BpmnLoaderService);
    const executor = moduleRef.get(BpmnExecutorService);
    const emitter = moduleRef.get(EventEmitter2);

    await loader.loadFromString(simpleProcessXml);

    let processId: string | undefined;
    emitter.on('bpmn.process.started', (p: { processId: string }) => {
      processId = p.processId;
    });

    await executor.execute('SimpleProcess', { x: 1 });

    // Should still be accessible immediately (cleanup is on 5-min timer)
    const status = await executor.getStatus(processId!);
    expect(status).toBeDefined();
    expect(status!.status).toBe('completed');

    await moduleRef.close();
  });
});

// =============================================================================
// Multi-process BPMN support
// =============================================================================

describe('Multi-process BPMN support', () => {
  it('loader stores all processes from a multi-process BPMN file', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
    }).compile();
    await moduleRef.init();

    const loader = moduleRef.get(BpmnLoaderService);

    const multiProcessXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  id="Definitions_Multi"
                  targetNamespace="http://example.com/multi">
  <bpmn:process id="ProcessA" isExecutable="true">
    <bpmn:startEvent id="StartA"><bpmn:outgoing>FlowA</bpmn:outgoing></bpmn:startEvent>
    <bpmn:endEvent id="EndA"><bpmn:incoming>FlowA</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="FlowA" sourceRef="StartA" targetRef="EndA" />
  </bpmn:process>
  <bpmn:process id="ProcessB" isExecutable="true">
    <bpmn:startEvent id="StartB"><bpmn:outgoing>FlowB</bpmn:outgoing></bpmn:startEvent>
    <bpmn:endEvent id="EndB"><bpmn:incoming>FlowB</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="FlowB" sourceRef="StartB" targetRef="EndB" />
  </bpmn:process>
</bpmn:definitions>`;

    await loader.loadFromString(multiProcessXml);

    expect(loader.hasDefinition('ProcessA')).toBe(true);
    expect(loader.hasDefinition('ProcessB')).toBe(true);

    await moduleRef.close();
  });
});

// =============================================================================
// Loader: incoming/outgoing on tasks
// =============================================================================

describe('Loader parses incoming/outgoing on tasks', () => {
  it('task definitions have incoming and outgoing flow references', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
    }).compile();
    await moduleRef.init();

    const loader = moduleRef.get(BpmnLoaderService);
    await loader.loadFromString(simpleProcessXml);
    const def = loader.getDefinition('SimpleProcess');

    expect(def).toBeDefined();
    const validateTask = def!.tasks.find(t => t.id === 'Task_Validate');
    expect(validateTask).toBeDefined();
    expect(validateTask!.incoming).toContain('Flow_1');
    expect(validateTask!.outgoing).toContain('Flow_2');

    const processTask = def!.tasks.find(t => t.id === 'Task_Process');
    expect(processTask).toBeDefined();
    expect(processTask!.incoming).toContain('Flow_2');
    expect(processTask!.outgoing).toContain('Flow_3');

    await moduleRef.close();
  });
});

// =============================================================================
// Missing negative cases
// =============================================================================

describe('Additional negative cases', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
    }).compile();
    await moduleRef.init();
    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('TC-N-011: duplicate process name overwrites previous definition', async () => {
    await loader.loadFromString(simpleProcessXml);
    const def1 = loader.getDefinition('SimpleProcess');
    expect(def1).toBeDefined();

    // Load again - should overwrite
    await loader.loadFromString(simpleProcessXml);
    const def2 = loader.getDefinition('SimpleProcess');
    expect(def2).toBeDefined();
    // They are different object references
    expect(def2).not.toBe(def1);
  });

  it('TC-N-012: retry method throws for non-existent processId', async () => {
    await expect(executor.retry('nonexistent', 'task-1')).rejects.toThrow(BpmnExecutionError);
  });

  it('TC-N-013: retry method throws for non-existent taskId', async () => {
    await loader.loadFromString(simpleProcessXml);

    const emitter = moduleRef.get(EventEmitter2);
    let processId: string | undefined;
    emitter.on('bpmn.process.started', (p: { processId: string }) => {
      processId = p.processId;
    });

    await executor.execute('SimpleProcess', { x: 1 });

    await expect(executor.retry(processId!, 'nonexistent-task')).rejects.toThrow(BpmnExecutionError);
  });

  it('TC-N-014: executeAsync returns startedAt in result', async () => {
    await loader.loadFromString(simpleProcessXml);
    const result = await executor.executeAsync('SimpleProcess', { x: 1 });
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.status).toBe('pending');
  });
});
