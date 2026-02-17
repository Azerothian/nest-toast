import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowExecutorService } from '../../services/workflow-executor.service';
import { ChainExecutorService } from '../../services/chain-executor.service';
import { ChainContextService } from '../../services/chain-context.service';
import { PluginRegistryService } from '../../services/plugin-registry.service';

function makeMockEventEmitter() {
  const emitted: Array<[string, unknown]> = [];
  return {
    emit: vi.fn((event: string, data: unknown) => { emitted.push([event, data]); }),
    emitted,
  };
}

function makeMockRegistry(handlers: Array<{ instance: unknown; method: string }> = []) {
  return {
    getHandlersForEvent: vi.fn(() => handlers),
  };
}

describe('WorkflowExecutorService', () => {
  let contextService: ChainContextService;
  let executorService: ChainExecutorService;
  let mockRegistry: ReturnType<typeof makeMockRegistry>;
  let mockEmitter: ReturnType<typeof makeMockEventEmitter>;
  let workflow: WorkflowExecutorService;

  beforeEach(() => {
    contextService = new ChainContextService();
    executorService = new ChainExecutorService(contextService);
    mockRegistry = makeMockRegistry();
    mockEmitter = makeMockEventEmitter();

    workflow = new WorkflowExecutorService(
      executorService,
      mockRegistry as unknown as PluginRegistryService,
      mockEmitter as never,
      contextService,
    );
  });

  it('should execute steps in order and return final data', async () => {
    const result = await workflow.executeWorkflow('test', { value: 0 }, [
      { name: 'step1', handler: async (d) => ({ ...(d as object), step1: true }) },
      { name: 'step2', handler: async (d) => ({ ...(d as object), step2: true }) },
    ]);
    expect(result).toEqual({ value: 0, step1: true, step2: true });
  });

  it('should emit workflow started and completed events', async () => {
    await workflow.executeWorkflow('my-workflow', {}, [
      { name: 'step1', handler: async (d) => d },
    ]);
    const eventNames = mockEmitter.emitted.map(([name]) => name);
    expect(eventNames).toContain('workflow:my-workflow:started');
    expect(eventNames).toContain('workflow:my-workflow:completed');
  });

  it('should emit step started and completed events', async () => {
    await workflow.executeWorkflow('wf', {}, [
      { name: 'myStep', handler: async (d) => d },
    ]);
    const eventNames = mockEmitter.emitted.map(([name]) => name);
    expect(eventNames).toContain('workflow:wf:step:myStep:started');
    expect(eventNames).toContain('workflow:wf:step:myStep:completed');
  });

  it('should emit the step emitEvent', async () => {
    await workflow.executeWorkflow('wf', {}, [
      { name: 'step1', handler: async (d) => d, emitEvent: 'custom:event' },
    ]);
    const eventNames = mockEmitter.emitted.map(([name]) => name);
    expect(eventNames).toContain('custom:event');
  });

  it('should support dynamic emitEvent via factory function', async () => {
    await workflow.executeWorkflow('wf', { type: 'order' }, [
      {
        name: 'step1',
        handler: async (d) => d,
        emitEvent: (data) => `${(data as { type: string }).type}:done`,
      },
    ]);
    const eventNames = mockEmitter.emitted.map(([name]) => name);
    expect(eventNames).toContain('order:done');
  });

  it('should dispatch @OnChainEvent handlers when emitEvent matches', async () => {
    let handlerCalled = false;
    const handlerInstance = {
      handle: async (data: unknown) => { handlerCalled = true; return data; },
    };
    mockRegistry.getHandlersForEvent.mockReturnValue([
      { instance: handlerInstance, method: 'handle' },
    ]);

    await workflow.executeWorkflow('wf', { x: 1 }, [
      { name: 's', handler: async (d) => d, emitEvent: 'test:event' },
    ]);
    expect(handlerCalled).toBe(true);
  });

  it('should stop further steps when chain is cancelled', async () => {
    const executed: string[] = [];

    // First step cancels the chain context
    const step1Handler = async (d: unknown) => {
      executed.push('step1');
      contextService.cancel(new Error('cancelled by step'));
      return d;
    };

    mockRegistry.getHandlersForEvent.mockReturnValue([]);

    await workflow.executeWorkflow('wf', {}, [
      { name: 'step1', handler: step1Handler, emitEvent: 'e1' },
      {
        name: 'step2',
        handler: async (d) => { executed.push('step2'); return d; },
        emitEvent: 'e2',
      },
    ]);

    expect(executed).toContain('step1');
    expect(executed).not.toContain('step2');
  });

  it('should work without any steps', async () => {
    const result = await workflow.executeWorkflow('empty', { val: 99 }, []);
    expect(result).toEqual({ val: 99 });
  });
});
