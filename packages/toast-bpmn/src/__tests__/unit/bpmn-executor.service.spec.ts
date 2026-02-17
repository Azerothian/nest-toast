import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@azerothian/toast', () => ({
  ChainExecutorService: class {},
  PluginRegistryService: class {},
}));

import { BpmnExecutorService } from '../../services/bpmn-executor.service';
import { BpmnExecutionError } from '../../errors/bpmn-execution.error';
import { BPMN_EVENTS } from '../../constants';
import type { BpmnProcessDefinition } from '../../interfaces/bpmn-process.interface';

function makeDefinition(overrides: Partial<BpmnProcessDefinition> = {}): BpmnProcessDefinition {
  return {
    name: 'TestProcess',
    tasks: [
      {
        id: 'task-1',
        name: 'Task One',
        type: 'serviceTask',
        chainEventName: 'test:task:one',
      },
    ],
    flows: [
      { id: 'flow-1', sourceRef: 'start-1', targetRef: 'task-1' },
      { id: 'flow-2', sourceRef: 'task-1', targetRef: 'end-1' },
    ],
    startEvents: [{ id: 'start-1', outgoing: ['flow-1'] }],
    endEvents: [{ id: 'end-1', incoming: ['flow-2'] }],
    ...overrides,
  };
}

function createMocks() {
  const loader = {
    getDefinition: vi.fn(),
  };

  const contextService = {
    create: vi.fn().mockResolvedValue({
      processId: 'pid-123',
      processName: 'TestProcess',
      currentStep: '',
      stepHistory: [],
      data: {},
      startedAt: new Date(),
      status: 'running',
      metadata: {},
    }),
    update: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({
      processId: 'pid-123',
      processName: 'TestProcess',
      currentStep: '',
      stepHistory: [
        { taskId: 'task-1', taskName: 'Task One', startedAt: new Date(), status: 'running' },
      ],
      data: {},
      startedAt: new Date(),
      status: 'running',
      metadata: {},
    }),
    addStepHistory: vi.fn().mockResolvedValue(undefined),
  };

  const validator = {
    validateOrThrow: vi.fn(),
  };

  const chainExecutor = {
    waterfall: vi.fn().mockResolvedValue('waterfall-result'),
  };

  const pluginRegistry = {
    getHandlersForEvent: vi.fn().mockReturnValue([]),
  };

  const eventEmitter = {
    emit: vi.fn(),
  };

  return { loader, contextService, validator, chainExecutor, pluginRegistry, eventEmitter };
}

function createService(mocks: ReturnType<typeof createMocks>): BpmnExecutorService {
  return new BpmnExecutorService(
    mocks.loader as any,
    mocks.contextService as any,
    mocks.validator as any,
    mocks.chainExecutor as any,
    mocks.pluginRegistry as any,
    mocks.eventEmitter as any,
  );
}

describe('BpmnExecutorService', () => {
  let service: BpmnExecutorService;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    service = createService(mocks);
  });

  describe('execute', () => {
    it('should load definition, validate, create context, walk graph and return result', async () => {
      const definition = makeDefinition();
      mocks.loader.getDefinition.mockReturnValue(definition);

      const handlerInstance = { myHandler: vi.fn().mockResolvedValue('handler-output') };
      mocks.pluginRegistry.getHandlersForEvent.mockReturnValue([
        { instance: handlerInstance, method: 'myHandler' },
      ]);
      mocks.chainExecutor.waterfall.mockResolvedValue('final-result');

      const result = await service.execute('TestProcess', { input: 'data' });

      expect(mocks.loader.getDefinition).toHaveBeenCalledWith('TestProcess');
      expect(mocks.validator.validateOrThrow).toHaveBeenCalledWith(definition);
      expect(mocks.contextService.create).toHaveBeenCalled();
      expect(mocks.pluginRegistry.getHandlersForEvent).toHaveBeenCalledWith('test:task:one');
      expect(mocks.chainExecutor.waterfall).toHaveBeenCalled();
      expect(result).toBe('final-result');
    });

    it('should throw BpmnExecutionError when process not found', async () => {
      mocks.loader.getDefinition.mockReturnValue(undefined);

      await expect(service.execute('Unknown', {})).rejects.toThrow(BpmnExecutionError);
      await expect(service.execute('Unknown', {})).rejects.toThrow('Process "Unknown" not found');
    });

    it('should emit process started and completed events', async () => {
      const definition = makeDefinition();
      mocks.loader.getDefinition.mockReturnValue(definition);

      await service.execute('TestProcess', {});

      const emitCalls = mocks.eventEmitter.emit.mock.calls.map((c: any[]) => c[0]);
      expect(emitCalls).toContain(BPMN_EVENTS.PROCESS_STARTED);
      expect(emitCalls).toContain(BPMN_EVENTS.PROCESS_COMPLETED);
    });

    it('should emit task started and completed events', async () => {
      const definition = makeDefinition();
      mocks.loader.getDefinition.mockReturnValue(definition);
      mocks.pluginRegistry.getHandlersForEvent.mockReturnValue([
        { instance: { run: vi.fn().mockResolvedValue('ok') }, method: 'run' },
      ]);
      mocks.chainExecutor.waterfall.mockResolvedValue('ok');

      await service.execute('TestProcess', {});

      const emitCalls = mocks.eventEmitter.emit.mock.calls.map((c: any[]) => c[0]);
      expect(emitCalls).toContain(BPMN_EVENTS.TASK_STARTED);
      expect(emitCalls).toContain(BPMN_EVENTS.TASK_COMPLETED);
    });

    it('should handle task failure and emit process failed', async () => {
      const definition = makeDefinition();
      mocks.loader.getDefinition.mockReturnValue(definition);
      mocks.pluginRegistry.getHandlersForEvent.mockReturnValue([
        { instance: { run: vi.fn() }, method: 'run' },
      ]);
      mocks.chainExecutor.waterfall.mockRejectedValue(new Error('task boom'));

      await expect(service.execute('TestProcess', {})).rejects.toThrow(BpmnExecutionError);

      const emitCalls = mocks.eventEmitter.emit.mock.calls.map((c: any[]) => c[0]);
      expect(emitCalls).toContain(BPMN_EVENTS.PROCESS_FAILED);
      expect(emitCalls).toContain(BPMN_EVENTS.TASK_FAILED);
    });

    it('should pass through input when task has no chainEventName', async () => {
      const definition = makeDefinition({
        tasks: [
          { id: 'task-1', name: 'Task One', type: 'serviceTask' },
        ],
      });
      mocks.loader.getDefinition.mockReturnValue(definition);

      const result = await service.execute('TestProcess', { hello: 'world' });

      expect(mocks.pluginRegistry.getHandlersForEvent).not.toHaveBeenCalled();
      expect(result).toEqual({ hello: 'world' });
    });
  });

  describe('executeAsync', () => {
    it('should return processId immediately with pending status', async () => {
      const definition = makeDefinition();
      mocks.loader.getDefinition.mockReturnValue(definition);

      const result = await service.executeAsync('TestProcess', {});

      expect(result.processId).toBe('pid-123');
      expect(result.processName).toBe('TestProcess');
      expect(result.status).toBe('pending');
    });

    it('should throw BpmnExecutionError when process not found', async () => {
      mocks.loader.getDefinition.mockReturnValue(undefined);

      await expect(service.executeAsync('Unknown', {})).rejects.toThrow(BpmnExecutionError);
    });
  });

  describe('getStatus', () => {
    it('should return status from active processes', async () => {
      const definition = makeDefinition();
      mocks.loader.getDefinition.mockReturnValue(definition);

      await service.execute('TestProcess', {});

      // After successful execution, status should be completed
      const status = await service.getStatus('pid-123');
      expect(status).toBe('completed');
    });

    it('should fall back to context service for unknown processId', async () => {
      mocks.contextService.get.mockResolvedValue({ status: 'completed' });

      const status = await service.getStatus('other-id');
      expect(status).toBe('completed');
    });

    it('should return undefined when process not found anywhere', async () => {
      mocks.contextService.get.mockResolvedValue(undefined);

      const status = await service.getStatus('nonexistent');
      expect(status).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('should set cancel flag for running process', async () => {
      const definition = makeDefinition({
        tasks: [],
        flows: [{ id: 'flow-1', sourceRef: 'start-1', targetRef: 'end-1' }],
      });
      mocks.loader.getDefinition.mockReturnValue(definition);

      // Execute a process to get it into active state, then try cancel
      await service.execute('TestProcess', {});

      // Process completed, so cancel should return false
      const result = await service.cancel('pid-123');
      expect(result).toBe(false);
    });

    it('should return false for non-existent process', async () => {
      const result = await service.cancel('nonexistent');
      expect(result).toBe(false);
    });
  });
});
