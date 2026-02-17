import 'reflect-metadata';
import { BpmnContextService } from '../../services/bpmn-context.service';
import type { StepHistoryEntry } from '../../interfaces/bpmn-context.interface';

function makeEntry(taskId: string): StepHistoryEntry {
  return {
    taskId,
    taskName: `Task ${taskId}`,
    startedAt: new Date(),
    status: 'completed',
  };
}

describe('BpmnContextService', () => {
  let service: BpmnContextService;

  beforeEach(() => {
    service = new BpmnContextService();
  });

  describe('create', () => {
    it('should return a context with a UUID processId', async () => {
      const ctx = await service.create('MyProcess', { foo: 'bar' });
      expect(ctx.processId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(ctx.processName).toBe('MyProcess');
      expect(ctx.data).toEqual({ foo: 'bar' });
      expect(ctx.status).toBe('running');
      expect(ctx.stepHistory).toHaveLength(0);
      expect(ctx.currentStep).toBe('');
      expect(ctx.startedAt).toBeInstanceOf(Date);
    });

    it('should create independent contexts for multiple calls', async () => {
      const a = await service.create('Proc', {});
      const b = await service.create('Proc', {});
      expect(a.processId).not.toBe(b.processId);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent processId', async () => {
      const result = await service.get('does-not-exist');
      expect(result).toBeUndefined();
    });

    it('should return the created context', async () => {
      const ctx = await service.create('P', { x: 1 });
      const fetched = await service.get(ctx.processId);
      expect(fetched).toBeDefined();
      expect(fetched!.processId).toBe(ctx.processId);
    });
  });

  describe('update', () => {
    it('should modify the context', async () => {
      const ctx = await service.create('P', {});
      await service.update(ctx.processId, { currentStep: 'step-1', status: 'completed' });
      const updated = await service.get(ctx.processId);
      expect(updated!.currentStep).toBe('step-1');
      expect(updated!.status).toBe('completed');
    });

    it('should return undefined for non-existent processId', async () => {
      const result = await service.update('no-id', { currentStep: 'x' });
      expect(result).toBeUndefined();
    });
  });

  describe('addStepHistory', () => {
    it('should append entries to stepHistory', async () => {
      const ctx = await service.create('P', {});
      await service.addStepHistory(ctx.processId, makeEntry('t1'));
      await service.addStepHistory(ctx.processId, makeEntry('t2'));
      const updated = await service.get(ctx.processId);
      expect(updated!.stepHistory).toHaveLength(2);
      expect(updated!.stepHistory[0].taskId).toBe('t1');
      expect(updated!.stepHistory[1].taskId).toBe('t2');
    });

    it('should do nothing for non-existent processId', async () => {
      await expect(service.addStepHistory('no-id', makeEntry('t1'))).resolves.toBeUndefined();
    });

    it('should trim stepHistory when maxHistorySize is configured', async () => {
      const svc = new BpmnContextService({ context: { maxHistorySize: 3 } } as any);
      const ctx = await svc.create('P', {});
      for (let i = 1; i <= 5; i++) {
        await svc.addStepHistory(ctx.processId, makeEntry(`t${i}`));
      }
      const updated = await svc.get(ctx.processId);
      expect(updated!.stepHistory).toHaveLength(3);
      // Should keep the last 3
      expect(updated!.stepHistory[0].taskId).toBe('t3');
      expect(updated!.stepHistory[2].taskId).toBe('t5');
    });
  });

  describe('serialize / deserialize', () => {
    it('should serialize and deserialize a context roundtrip', async () => {
      const ctx = await service.create('SerializeProc', { key: 'value' });
      const serialized = await service.serialize(ctx.processId);
      expect(typeof serialized).toBe('string');

      // Delete original and deserialize into a fresh service
      await service.delete(ctx.processId);
      const restored = await service.deserialize(serialized!);
      expect(restored.processId).toBe(ctx.processId);
      expect(restored.processName).toBe('SerializeProc');
      expect(restored.data).toEqual({ key: 'value' });
    });

    it('should return undefined serialize for non-existent processId', async () => {
      const result = await service.serialize('no-id');
      expect(result).toBeUndefined();
    });

    it('should make deserialized context retrievable via get', async () => {
      const ctx = await service.create('P', {});
      const serialized = await service.serialize(ctx.processId);
      const svc2 = new BpmnContextService();
      const restored = await svc2.deserialize(serialized!);
      const fetched = await svc2.get(restored.processId);
      expect(fetched).toBeDefined();
      expect(fetched!.processId).toBe(ctx.processId);
    });
  });

  describe('delete', () => {
    it('should remove an existing context and return true', async () => {
      const ctx = await service.create('P', {});
      const result = await service.delete(ctx.processId);
      expect(result).toBe(true);
      expect(await service.get(ctx.processId)).toBeUndefined();
    });

    it('should return false for non-existent processId', async () => {
      const result = await service.delete('no-id');
      expect(result).toBe(false);
    });
  });
});
