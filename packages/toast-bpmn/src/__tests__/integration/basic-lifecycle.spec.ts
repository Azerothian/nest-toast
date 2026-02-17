import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

const FIXTURES_DIR = join(__dirname, '../../../test/fixtures');
const lifecycleXml = readFileSync(join(FIXTURES_DIR, 'lifecycle-test.bpmn'), 'utf-8');

@Injectable()
@Plugin({ name: 'lifecycle-step-handler', version: '1.0.0' })
class LifecycleStepHandler {
  @OnChainEvent<Record<string, unknown>>('lifecycle.step1')
  async step1(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { ...input, step1Done: true };
  }
}

@Injectable()
@Plugin({ name: 'failing-step-handler', version: '1.0.0' })
class FailingStepHandler {
  @OnChainEvent<Record<string, unknown>>('lifecycle.step1')
  async step1(_input: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('Handler intentionally failed');
  }
}

describe('Basic Lifecycle and Event Emission', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;
  let contextService: BpmnContextService;
  let emitter: EventEmitter2;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [LifecycleStepHandler],
    }).compile();

    await moduleRef.init();

    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    contextService = moduleRef.get(BpmnContextService);
    emitter = moduleRef.get(EventEmitter2);

    await loader.loadFromString(lifecycleXml);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('bpmn.process.started event payload has processId, processName, startedAt', async () => {
    let startedPayload: any;
    emitter.on('bpmn.process.started', (payload: any) => {
      startedPayload = payload;
    });

    await executor.execute('LifecycleProcess', { x: 1 });

    expect(startedPayload).toBeDefined();
    expect(startedPayload.processId).toBeDefined();
    expect(typeof startedPayload.processId).toBe('string');
    expect(startedPayload.processName).toBe('LifecycleProcess');
    expect(startedPayload.startedAt).toBeInstanceOf(Date);
  });

  it('bpmn.process.completed event payload has processId, processName, completedAt, duration, output', async () => {
    let completedPayload: any;
    emitter.on('bpmn.process.completed', (payload: any) => {
      completedPayload = payload;
    });

    const input = { x: 1 };
    await executor.execute('LifecycleProcess', input);

    expect(completedPayload).toBeDefined();
    expect(completedPayload.processId).toBeDefined();
    expect(completedPayload.processName).toBe('LifecycleProcess');
    expect(completedPayload.completedAt).toBeInstanceOf(Date);
    expect(typeof completedPayload.duration).toBe('number');
    expect(completedPayload.duration).toBeGreaterThanOrEqual(0);
    expect(completedPayload.output).toBeDefined();
  });

  it('bpmn.process.failed event when handler throws - payload has processId, error', async () => {
    // Build a module with the failing handler
    const failingModuleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [FailingStepHandler],
    }).compile();
    await failingModuleRef.init();

    const failingLoader = failingModuleRef.get(BpmnLoaderService);
    const failingExecutor = failingModuleRef.get(BpmnExecutorService);
    const failingEmitter = failingModuleRef.get(EventEmitter2);

    await failingLoader.loadFromString(lifecycleXml);

    let failedPayload: any;
    failingEmitter.on('bpmn.process.failed', (payload: any) => {
      failedPayload = payload;
    });

    await expect(failingExecutor.execute('LifecycleProcess', { x: 1 })).rejects.toThrow();

    expect(failedPayload).toBeDefined();
    expect(failedPayload.processId).toBeDefined();
    expect(failedPayload.error).toBeDefined();

    await failingModuleRef.close();
  });

  it('bpmn.task.started and bpmn.task.completed events emitted per task', async () => {
    const taskStartedPayloads: any[] = [];
    const taskCompletedPayloads: any[] = [];

    emitter.on('bpmn.task.started', (payload: any) => {
      taskStartedPayloads.push(payload);
    });
    emitter.on('bpmn.task.completed', (payload: any) => {
      taskCompletedPayloads.push(payload);
    });

    await executor.execute('LifecycleProcess', { x: 1 });

    expect(taskStartedPayloads).toHaveLength(1);
    expect(taskStartedPayloads[0].taskId).toBe('Task_Step1');
    expect(taskStartedPayloads[0].taskName).toBe('Step One');
    expect(taskStartedPayloads[0].startedAt).toBeInstanceOf(Date);

    expect(taskCompletedPayloads).toHaveLength(1);
    expect(taskCompletedPayloads[0].taskId).toBe('Task_Step1');
    expect(taskCompletedPayloads[0].completedAt).toBeInstanceOf(Date);
    expect(typeof taskCompletedPayloads[0].duration).toBe('number');
  });

  it('context is created and updated throughout execution - status transitions', async () => {
    let capturedProcessId: string | undefined;

    emitter.on('bpmn.process.started', (payload: any) => {
      capturedProcessId = payload.processId;
    });

    await executor.execute('LifecycleProcess', { x: 1 });

    expect(capturedProcessId).toBeDefined();
    const ctx = await contextService.get(capturedProcessId!);
    expect(ctx).toBeDefined();
    expect(ctx!.status).toBe('completed');
    expect(ctx!.processName).toBe('LifecycleProcess');
  });

  it('step history records each task execution', async () => {
    let capturedProcessId: string | undefined;

    emitter.on('bpmn.process.started', (payload: any) => {
      capturedProcessId = payload.processId;
    });

    await executor.execute('LifecycleProcess', { x: 1 });

    const ctx = await contextService.get(capturedProcessId!);
    expect(ctx).toBeDefined();
    expect(ctx!.stepHistory).toHaveLength(1);
    expect(ctx!.stepHistory[0].taskId).toBe('Task_Step1');
    expect(ctx!.stepHistory[0].status).toBe('completed');
    expect(ctx!.stepHistory[0].startedAt).toBeDefined();
    expect(ctx!.stepHistory[0].completedAt).toBeDefined();
  });
});
