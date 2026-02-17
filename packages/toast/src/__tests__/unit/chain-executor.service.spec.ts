import { describe, it, expect, beforeEach } from 'vitest';
import { ChainExecutorService } from '../../services/chain-executor.service';
import { ChainContextService } from '../../services/chain-context.service';
import { ChainExecutionError } from '../../errors/chain-execution.error';

describe('ChainExecutorService', () => {
  let context: ChainContextService;
  let executor: ChainExecutorService;

  beforeEach(() => {
    context = new ChainContextService();
    executor = new ChainExecutorService(context);
  });

  describe('waterfall()', () => {
    it('should execute handlers sequentially passing result forward', async () => {
      const result = await executor.waterfall(1, [
        async (n) => n + 1,
        async (n) => n * 2,
        async (n) => n + 10,
      ]);
      expect(result).toBe(14); // ((1+1)*2)+10
    });

    it('should pass initial args to all handlers while flowing return values', async () => {
      const receivedArgs: Array<{ input: number; arg1: string; arg2: number }> = [];

      const result = await executor.waterfall<number, [string, number]>(
        1,
        [
          async (n, arg1, arg2) => {
            receivedArgs.push({ input: n, arg1, arg2 });
            return n + 1;
          },
          async (n, arg1, arg2) => {
            receivedArgs.push({ input: n, arg1, arg2 });
            return n * 2;
          },
          async (n, arg1, arg2) => {
            receivedArgs.push({ input: n, arg1, arg2 });
            return n + arg2;
          },
        ],
        undefined,
        'context',
        10,
      );

      // Return value should flow through: (1+1) * 2 + 10 = 14
      expect(result).toBe(14);

      // Initial args should stay constant while input flows
      expect(receivedArgs).toEqual([
        { input: 1, arg1: 'context', arg2: 10 },
        { input: 2, arg1: 'context', arg2: 10 },
        { input: 4, arg1: 'context', arg2: 10 },
      ]);
    });

    it('should work without initial args (backward compatibility)', async () => {
      const result = await executor.waterfall(5, [
        async (n) => n + 1,
        async (n) => n * 2,
      ]);
      expect(result).toBe(12); // (5+1)*2
    });

    it('should return initial value for empty handlers', async () => {
      const result = await executor.waterfall(42, []);
      expect(result).toBe(42);
    });

    it('should stop and return current value when cancelled', async () => {
      const executed: number[] = [];
      await executor.waterfall(1, [
        async (n) => { executed.push(1); return n + 1; },
        async (n) => { executed.push(2); context.cancel(new Error('stop')); return n; },
        async (n) => { executed.push(3); return n; },
      ]);
      expect(executed).toEqual([1, 2]);
      expect(context.isCancelled()).toBe(true);
    });

    it('should stop when finished', async () => {
      const executed: number[] = [];
      await executor.waterfall(0, [
        async (n) => { executed.push(1); return n + 1; },
        async (n) => { executed.push(2); context.finish(); return n; },
        async (n) => { executed.push(3); return n; },
      ]);
      expect(executed).toEqual([1, 2]);
      expect(context.isFinished()).toBe(true);
    });

    it('should throw ChainExecutionError when a handler throws', async () => {
      await expect(
        executor.waterfall(1, [
          async (n) => n + 1,
          async () => { throw new Error('handler failed'); },
        ])
      ).rejects.toThrow(ChainExecutionError);
    });

    it('should include execution trace in ChainExecutionError', async () => {
      try {
        await executor.waterfall(1, [
          async (n) => n + 1,
          async () => { throw new Error('handler failed'); },
        ]);
      } catch (err) {
        expect(err).toBeInstanceOf(ChainExecutionError);
        const chainErr = err as ChainExecutionError;
        expect(chainErr.executionTrace.handlers).toHaveLength(2);
        expect(chainErr.executionTrace.handlers[0].success).toBe(true);
        expect(chainErr.executionTrace.handlers[1].success).toBe(false);
      }
    });

    it('should timeout when handler exceeds timeout limit', async () => {
      await expect(
        executor.waterfall(1, [
          async (n) => {
            await new Promise(r => setTimeout(r, 500));
            return n;
          },
        ], { timeout: 50 })
      ).rejects.toThrow(/timeout/i);
    });

    it('should store execution trace in context after success', async () => {
      await executor.waterfall(0, [async (n) => n + 1]);
      const trace = context.getExecutionTrace();
      expect(trace).toBeDefined();
      expect(trace!.handlers).toHaveLength(1);
      expect(trace!.handlers[0].success).toBe(true);
    });
  });

  describe('parallel()', () => {
    it('should execute all handlers against the same input', async () => {
      const results = await executor.parallel<string, unknown>('test', [
        async (s) => s.toUpperCase(),
        async (s) => s.length,
        async (s) => s.repeat(2),
      ]);
      expect(results).toEqual(['TEST', 4, 'testtest']);
    });

    it('should pass initial args to all parallel handlers', async () => {
      const results = await executor.parallel<number, string, [string]>(
        10,
        [
          async (n, prefix) => `${prefix}-${n}`,
          async (n, prefix) => `${prefix}:${n * 2}`,
          async (n, prefix) => `${prefix}/${n + 1}`,
        ],
        undefined,
        'item',
      );
      expect(results).toEqual(['item-10', 'item:20', 'item/11']);
    });

    it('should execute with concurrency limit', async () => {
      let active = 0;
      let maxActive = 0;

      const makeHandler = (_: number, i: number) => async (n: number) => {
        active++;
        if (active > maxActive) maxActive = active;
        await new Promise(r => setTimeout(r, 20));
        active--;
        return n + i;
      };

      await executor.parallel(0, Array.from({ length: 6 }, makeHandler), { concurrency: 2 });
      expect(maxActive).toBeLessThanOrEqual(2);
    });

    it('should produce correct results with concurrency', async () => {
      const results = await executor.parallel(10, [
        async (n) => n + 1,
        async (n) => n + 2,
        async (n) => n + 3,
      ], { concurrency: 2 });
      expect(results).toEqual([11, 12, 13]);
    });

    it('should propagate rejections', async () => {
      await expect(
        executor.parallel(1, [
          async (n) => n,
          async () => { throw new Error('parallel fail'); },
        ])
      ).rejects.toThrow('parallel fail');
    });
  });

  describe('race()', () => {
    it('should return first resolved result', async () => {
      const result = await executor.race(5, [
        async (n) => { await new Promise(r => setTimeout(r, 100)); return n * 2; },
        async (n) => n + 1,
        async (n) => { await new Promise(r => setTimeout(r, 200)); return n * 3; },
      ]);
      expect(result).toBe(6); // 5+1 wins
    });

    it('should work with single handler', async () => {
      const result = await executor.race(7, [async (n) => n * 3]);
      expect(result).toBe(21);
    });

    it('should pass initial args to race handlers', async () => {
      const result = await executor.race<number, string, [string]>(
        5,
        [
          async (n, prefix) => { await new Promise(r => setTimeout(r, 100)); return `${prefix}-slow`; },
          async (n, prefix) => `${prefix}-${n}`,
        ],
        'result',
      );
      expect(result).toBe('result-5'); // Fast one wins
    });
  });

  describe('allSettled()', () => {
    it('should return all results including rejected', async () => {
      const results = await executor.allSettled(1, [
        async (n) => n + 1,
        async () => { throw new Error('failed'); },
        async (n) => n * 2,
      ]);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') expect(results[0].value).toBe(2);
      if (results[2].status === 'fulfilled') expect(results[2].value).toBe(2);
    });

    it('should pass initial args to allSettled handlers', async () => {
      const results = await executor.allSettled<number, string, [number]>(
        10,
        [
          async (n, multiplier) => `value: ${n * multiplier}`,
          async (n, multiplier) => `double: ${n * multiplier * 2}`,
        ],
        2,
      );
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') expect(results[0].value).toBe('value: 20');
      if (results[1].status === 'fulfilled') expect(results[1].value).toBe('double: 40');
    });
  });

  describe('pipeline()', () => {
    it('should execute stages sequentially', async () => {
      const { output } = await executor.pipeline<number, number>(1, [
        { name: 'add', handler: async (n) => (n as number) + 1 },
        { name: 'mul', handler: async (n) => (n as number) * 2 },
        { name: 'sub', handler: async (n) => (n as number) - 1 },
      ]);
      expect(output).toBe(3); // ((1+1)*2)-1
    });

    it('should return timing for each stage', async () => {
      const { timing } = await executor.pipeline(0, [
        { name: 'stageA', handler: async (n) => n },
        { name: 'stageB', handler: async (n) => n },
      ]);
      expect(timing.has('stageA')).toBe(true);
      expect(timing.has('stageB')).toBe(true);
      expect(timing.get('stageA')).toBeGreaterThanOrEqual(0);
      expect(timing.get('stageB')).toBeGreaterThanOrEqual(0);
    });

    it('should return empty result for empty stages', async () => {
      const { output } = await executor.pipeline<string, string>('hello', []);
      expect(output).toBe('hello');
    });

    it('should pass initial args to all pipeline stages', async () => {
      interface Context { multiplier: number }
      const receivedContexts: Context[] = [];

      const { output } = await executor.pipeline<number, number, [Context]>(
        1,
        [
          {
            name: 'add',
            handler: async (n, ctx) => {
              receivedContexts.push(ctx);
              return (n as number) + ctx.multiplier;
            },
          },
          {
            name: 'mul',
            handler: async (n, ctx) => {
              receivedContexts.push(ctx);
              return (n as number) * ctx.multiplier;
            },
          },
        ],
        { multiplier: 3 },
      );

      // (1 + 3) * 3 = 12
      expect(output).toBe(12);
      expect(receivedContexts).toHaveLength(2);
      expect(receivedContexts[0]).toEqual({ multiplier: 3 });
      expect(receivedContexts[1]).toEqual({ multiplier: 3 });
    });
  });
});
