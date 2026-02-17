import { describe, it, expect, beforeEach } from 'vitest';
import { ChainContextService } from '../../services/chain-context.service';

describe('ChainContextService', () => {
  let service: ChainContextService;

  beforeEach(() => {
    service = new ChainContextService();
  });

  describe('run()', () => {
    it('should provide a context within the callback', async () => {
      await service.run(async () => {
        expect(service.getContext()).toBeDefined();
      });
    });

    it('should start with cancelled = false', async () => {
      await service.run(async () => {
        expect(service.isCancelled()).toBe(false);
      });
    });

    it('should start with finished = false', async () => {
      await service.run(async () => {
        expect(service.isFinished()).toBe(false);
      });
    });

    it('should return the fn result', async () => {
      const result = await service.run(async () => 42);
      expect(result).toBe(42);
    });

    it('should propagate errors from fn', async () => {
      await expect(service.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    });
  });

  describe('cancel()', () => {
    it('should set isCancelled() true within run()', async () => {
      await service.run(async () => {
        service.cancel(new Error('stopped'));
        expect(service.isCancelled()).toBe(true);
      });
    });

    it('should set isCancelled() true after run() via _lastContext', async () => {
      await service.run(async () => {
        service.cancel(new Error('stopped'));
      });
      expect(service.isCancelled()).toBe(true);
    });

    it('should store the cancel reason', async () => {
      await service.run(async () => {
        service.cancel(new Error('my reason'));
        expect(service.getReason()?.message).toBe('my reason');
      });
    });

    it('should work without a reason argument', async () => {
      await service.run(async () => {
        service.cancel();
        expect(service.isCancelled()).toBe(true);
        expect(service.getReason()).toBeUndefined();
      });
    });
  });

  describe('finish()', () => {
    it('should set isFinished() true', async () => {
      await service.run(async () => {
        service.finish();
        expect(service.isFinished()).toBe(true);
      });
    });

    it('should persist isFinished() after run() via _lastContext', async () => {
      await service.run(async () => {
        service.finish();
      });
      expect(service.isFinished()).toBe(true);
    });
  });

  describe('results', () => {
    it('should store and retrieve a result', async () => {
      await service.run(async () => {
        service.setResult('key', 'value');
        expect(service.getResult('key')).toBe('value');
      });
    });

    it('should return undefined for unknown key', async () => {
      await service.run(async () => {
        expect(service.getResult('missing')).toBeUndefined();
      });
    });

    it('should store typed results', async () => {
      await service.run(async () => {
        service.setResult('count', 42);
        expect(service.getResult<number>('count')).toBe(42);
      });
    });
  });

  describe('currentEvent', () => {
    it('should store and retrieve current event', async () => {
      await service.run(async () => {
        const event = { name: 'test:event', data: { x: 1 }, timestamp: new Date() };
        service.setCurrentEvent(event);
        expect(service.getCurrentEvent()).toBe(event);
      });
    });
  });

  describe('tracking', () => {
    it('should default to tracking disabled', async () => {
      await service.run(async () => {
        expect(service.isTrackingEnabled()).toBe(false);
      });
    });

    it('should enable tracking', async () => {
      await service.run(async () => {
        service.setTrackingEnabled(true);
        expect(service.isTrackingEnabled()).toBe(true);
      });
    });

    it('should record handler start and end', async () => {
      await service.run(async () => {
        service.setTrackingEnabled(true);
        service.recordHandlerStart('myHandler');
        service.recordHandlerEnd('myHandler', true);
        const trace = service.getExecutionTrace();
        expect(trace?.handlers).toHaveLength(1);
        expect(trace?.handlers[0].handlerName).toBe('myHandler');
        expect(trace?.handlers[0].success).toBe(true);
        expect(trace?.handlers[0].duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should record handler failure', async () => {
      await service.run(async () => {
        service.setTrackingEnabled(true);
        service.recordHandlerStart('failHandler');
        service.recordHandlerEnd('failHandler', false, new Error('oops'));
        const trace = service.getExecutionTrace();
        expect(trace?.handlers[0].success).toBe(false);
        expect(trace?.handlers[0].error?.message).toBe('oops');
      });
    });
  });

  describe('getContext()', () => {
    it('should return undefined outside run()', () => {
      const freshService = new ChainContextService();
      expect(freshService.getContext()).toBeUndefined();
    });
  });
});
