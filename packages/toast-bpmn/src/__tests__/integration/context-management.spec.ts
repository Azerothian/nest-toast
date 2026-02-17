import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ToastModule } from '@azerothian/toast';
import { ToastBpmnModule } from '../../toast-bpmn.module';
import { BpmnContextService } from '../../services/bpmn-context.service';

// UUID v4 regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('TC-P-011 to TC-P-015: Context Management', () => {
  let moduleRef: TestingModule;
  let contextService: BpmnContextService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
    }).compile();

    await moduleRef.init();
    contextService = moduleRef.get(BpmnContextService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('TC-P-011: create context - has processId (UUID), processName, startedAt, status=running', async () => {
    const ctx = await contextService.create('TestProcess', { foo: 'bar' });

    expect(ctx).toBeDefined();
    expect(ctx.processId).toMatch(UUID_REGEX);
    expect(ctx.processName).toBe('TestProcess');
    expect(ctx.startedAt).toBeInstanceOf(Date);
    expect(ctx.status).toBe('running');
    expect(ctx.stepHistory).toEqual([]);
    expect(ctx.data).toEqual({ foo: 'bar' });
  });

  it('TC-P-012: update context - changes are persisted', async () => {
    const ctx = await contextService.create('UpdateProcess', { initial: true });
    const processId = ctx.processId;

    await contextService.update(processId, { status: 'completed', currentStep: 'Task_Final' });

    const updated = await contextService.get(processId);
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('completed');
    expect(updated!.currentStep).toBe('Task_Final');
    // Original data preserved
    expect(updated!.processName).toBe('UpdateProcess');
  });

  it('TC-P-013: add step history entries - order is preserved', async () => {
    const ctx = await contextService.create('HistoryProcess', {});
    const processId = ctx.processId;

    await contextService.addStepHistory(processId, {
      taskId: 'Task_A',
      taskName: 'Task A',
      startedAt: new Date(),
      status: 'completed',
    });

    await contextService.addStepHistory(processId, {
      taskId: 'Task_B',
      taskName: 'Task B',
      startedAt: new Date(),
      status: 'completed',
    });

    await contextService.addStepHistory(processId, {
      taskId: 'Task_C',
      taskName: 'Task C',
      startedAt: new Date(),
      status: 'running',
    });

    const retrieved = await contextService.get(processId);
    expect(retrieved!.stepHistory).toHaveLength(3);
    expect(retrieved!.stepHistory[0].taskId).toBe('Task_A');
    expect(retrieved!.stepHistory[1].taskId).toBe('Task_B');
    expect(retrieved!.stepHistory[2].taskId).toBe('Task_C');
  });

  it('TC-P-014: serialize context to JSON string, deserialize back, verify equality', async () => {
    const ctx = await contextService.create('SerializeProcess', { key: 'value', count: 42 });
    const processId = ctx.processId;

    await contextService.addStepHistory(processId, {
      taskId: 'Task_S',
      taskName: 'Serialize Task',
      startedAt: new Date(),
      status: 'completed',
    });

    const serialized = await contextService.serialize(processId);
    expect(serialized).toBeDefined();
    expect(typeof serialized).toBe('string');

    // Deserialize into a new context (stores it with same processId)
    const deserialized = await contextService.deserialize(serialized!);

    expect(deserialized.processId).toBe(processId);
    expect(deserialized.processName).toBe('SerializeProcess');
    expect(deserialized.status).toBe('running');
    // stepHistory length is preserved
    expect(deserialized.stepHistory).toHaveLength(1);
    expect(deserialized.stepHistory[0].taskId).toBe('Task_S');
  });

  it('TC-P-015: delete context - verify it is gone', async () => {
    const ctx = await contextService.create('DeleteProcess', {});
    const processId = ctx.processId;

    // Verify it exists
    const before = await contextService.get(processId);
    expect(before).toBeDefined();

    const deleted = await contextService.delete(processId);
    expect(deleted).toBe(true);

    const after = await contextService.get(processId);
    expect(after).toBeUndefined();
  });

  it('TC-P-016: multiple concurrent contexts are isolated (different processIds)', async () => {
    const ctx1 = await contextService.create('ProcessA', { source: 'A' });
    const ctx2 = await contextService.create('ProcessB', { source: 'B' });
    const ctx3 = await contextService.create('ProcessC', { source: 'C' });

    // All processIds are unique
    const ids = [ctx1.processId, ctx2.processId, ctx3.processId];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);

    // Each is a valid UUID
    ids.forEach(id => expect(id).toMatch(UUID_REGEX));

    // Updates to one do not affect others
    await contextService.update(ctx1.processId, { status: 'completed' });

    const retrieved2 = await contextService.get(ctx2.processId);
    const retrieved3 = await contextService.get(ctx3.processId);

    expect(retrieved2!.status).toBe('running');
    expect(retrieved3!.status).toBe('running');
    expect(retrieved2!.processName).toBe('ProcessB');
    expect(retrieved3!.processName).toBe('ProcessC');
  });
});
