import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { ToastModule, OnChainEvent, Plugin } from '@azerothian/toast';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ToastBpmnModule } from '../../toast-bpmn.module';
import { BpmnLoaderService } from '../../services/bpmn-loader.service';
import { BpmnExecutorService } from '../../services/bpmn-executor.service';

const FIXTURES_DIR = join(__dirname, '../../../test/fixtures');

const simpleProcessXml = readFileSync(join(FIXTURES_DIR, 'simple-process.bpmn'), 'utf-8');

// TC-P-002: Handler classes for simple process
@Injectable()
@Plugin({ name: 'validate-handler', version: '1.0.0' })
class ValidateHandler {
  @OnChainEvent<Record<string, unknown>>('simple.validate')
  async validate(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, validated: true };
  }
}

@Injectable()
@Plugin({ name: 'process-handler', version: '1.0.0' })
class ProcessHandler {
  @OnChainEvent<Record<string, unknown>>('simple.process')
  async process(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, processed: true };
  }
}

describe('TC-P-001 to TC-P-005: Basic BPMN Execution', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [ValidateHandler, ProcessHandler],
    }).compile();

    await moduleRef.init();

    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('TC-P-001: loads a BPMN process from XML string and stores the definition', async () => {
    await loader.loadFromString(simpleProcessXml);
    const definition = loader.getDefinition('SimpleProcess');

    expect(definition).toBeDefined();
    expect(definition!.name).toBe('SimpleProcess');
    expect(definition!.tasks).toHaveLength(2);
    expect(definition!.tasks[0].id).toBe('Task_Validate');
    expect(definition!.tasks[0].chainEventName).toBe('simple.validate');
    expect(definition!.tasks[1].id).toBe('Task_Process');
    expect(definition!.tasks[1].chainEventName).toBe('simple.process');
    expect(definition!.startEvents).toHaveLength(1);
    expect(definition!.endEvents).toHaveLength(1);
  });

  it('TC-P-002: executes a 2-task process with registered chain handlers - output flows through tasks', async () => {
    await loader.loadFromString(simpleProcessXml);
    const input = { name: 'test-data', value: 42 };
    const result = await executor.execute<typeof input, Record<string, unknown>>('SimpleProcess', input);

    expect(result).toMatchObject({
      name: 'test-data',
      value: 42,
      validated: true,
      processed: true,
    });
  });

  it('TC-P-003: emits process and task lifecycle events during execution', async () => {
    await loader.loadFromString(simpleProcessXml);
    const { EventEmitter2 } = await import('@nestjs/event-emitter');
    const emitter = moduleRef.get(EventEmitter2);

    const emittedEvents: string[] = [];
    emitter.onAny((event: string | string[]) => {
      if (typeof event === 'string') emittedEvents.push(event);
    });

    await executor.execute('SimpleProcess', { x: 1 });

    expect(emittedEvents).toContain('bpmn.process.started');
    expect(emittedEvents).toContain('bpmn.process.completed');
    expect(emittedEvents).toContain('bpmn.task.started');
    expect(emittedEvents).toContain('bpmn.task.completed');
  });

  it('TC-P-004: task execution order matches BPMN sequence flows', async () => {
    await loader.loadFromString(simpleProcessXml);
    const { EventEmitter2 } = await import('@nestjs/event-emitter');
    const emitter = moduleRef.get(EventEmitter2);

    const taskOrder: string[] = [];
    emitter.on('bpmn.task.started', (payload: { taskId: string }) => {
      taskOrder.push(payload.taskId);
    });

    await executor.execute('SimpleProcess', { x: 1 });

    expect(taskOrder).toEqual(['Task_Validate', 'Task_Process']);
  });

  it('TC-P-005: executes process with no matching handlers - tasks pass through input unchanged', async () => {
    // Load a process but use a fresh module without handlers
    const bareModuleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
    }).compile();
    await bareModuleRef.init();

    const bareLoader = bareModuleRef.get(BpmnLoaderService);
    const bareExecutor = bareModuleRef.get(BpmnExecutorService);

    await bareLoader.loadFromString(simpleProcessXml);
    const input = { name: 'passthrough', value: 99 };
    const result = await bareExecutor.execute<typeof input, typeof input>('SimpleProcess', input);

    // Without handlers, output equals input
    expect(result).toEqual(input);

    await bareModuleRef.close();
  });
});
