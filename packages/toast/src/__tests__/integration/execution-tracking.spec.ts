import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ToastModule } from '../../toast.module';
import { ChainExecutorService } from '../../services/chain-executor.service';
import { ChainContextService } from '../../services/chain-context.service';
import { ChainExecutionError } from '../../errors/chain-execution.error';

describe('Execution Tracking Integration', () => {
  let app: TestingModule;
  let executor: ChainExecutorService;
  let context: ChainContextService;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
    }).compile();

    executor = app.get<ChainExecutorService>(ChainExecutorService);
    context = app.get<ChainContextService>(ChainContextService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('execution trace on success', () => {
    it('should store execution trace after waterfall completes', async () => {
      await executor.waterfall(0, [
        async (n) => n + 1,
        async (n) => n + 2,
      ]);

      const trace = context.getExecutionTrace();
      expect(trace).toBeDefined();
      expect(trace!.handlers).toHaveLength(2);
    });

    it('should record handler start and end times', async () => {
      await executor.waterfall(0, [
        async (n) => n + 1,
      ]);

      const trace = context.getExecutionTrace();
      const handler = trace!.handlers[0];
      expect(handler.startTime).toBeGreaterThan(0);
      expect(handler.endTime).toBeDefined();
      expect(handler.duration).toBeGreaterThanOrEqual(0);
    });

    it('should mark all successful handlers as success=true', async () => {
      await executor.waterfall(0, [
        async (n) => n + 1,
        async (n) => n * 2,
        async (n) => n - 1,
      ]);

      const trace = context.getExecutionTrace();
      expect(trace!.handlers.every(h => h.success)).toBe(true);
    });

    it('should record trace start and end time', async () => {
      await executor.waterfall(0, [async (n) => n]);

      const trace = context.getExecutionTrace();
      expect(trace!.startTime).toBeGreaterThan(0);
      expect(trace!.endTime).toBeDefined();
      expect(trace!.endTime!).toBeGreaterThanOrEqual(trace!.startTime);
    });

    it('should record handler names', async () => {
      async function addOne(n: number) { return n + 1; }
      async function double(n: number) { return n * 2; }

      await executor.waterfall(0, [addOne, double]);

      const trace = context.getExecutionTrace();
      expect(trace!.handlers[0].handlerName).toBe('addOne');
      expect(trace!.handlers[1].handlerName).toBe('double');
    });
  });

  describe('execution trace on failure', () => {
    it('should include trace in ChainExecutionError', async () => {
      let caughtError: ChainExecutionError | undefined;

      try {
        await executor.waterfall(0, [
          async (n) => n + 1,
          async () => { throw new Error('intentional failure'); },
        ]);
      } catch (err) {
        caughtError = err as ChainExecutionError;
      }

      expect(caughtError).toBeInstanceOf(ChainExecutionError);
      expect(caughtError!.executionTrace.handlers).toHaveLength(2);
      expect(caughtError!.executionTrace.handlers[0].success).toBe(true);
      expect(caughtError!.executionTrace.handlers[1].success).toBe(false);
      expect(caughtError!.executionTrace.handlers[1].error?.message).toBe('intentional failure');
    });

    it('should have a non-empty formattedTrace on error', async () => {
      try {
        await executor.waterfall(0, [
          async () => { throw new Error('fail'); },
        ]);
      } catch (err) {
        const chainErr = err as ChainExecutionError;
        expect(chainErr.formattedTrace).toBeTruthy();
        expect(chainErr.formattedTrace.length).toBeGreaterThan(0);
      }
    });

    it('should serialize error trace to JSON', async () => {
      try {
        await executor.waterfall(0, [
          async (n) => n,
          async () => { throw new Error('json-fail'); },
        ]);
      } catch (err) {
        const chainErr = err as ChainExecutionError;
        const json = chainErr.toJSON() as Record<string, unknown>;
        expect(json.name).toBe('ChainExecutionError');
        expect(json.originalError).toBeDefined();
        expect(json.executionTrace).toBeDefined();
      }
    });

    it('should format as timeline', async () => {
      try {
        await executor.waterfall(0, [
          async () => { throw new Error('timeline-fail'); },
        ]);
      } catch (err) {
        const chainErr = err as ChainExecutionError;
        const timeline = chainErr.formatTimeline();
        expect(timeline).toContain('Timeline');
      }
    });
  });

  describe('timeout', () => {
    it('should throw on timeout with informative message', async () => {
      await expect(
        executor.waterfall(0, [
          async (n) => {
            await new Promise(r => setTimeout(r, 300));
            return n;
          },
        ], { timeout: 50 })
      ).rejects.toThrow(/timeout/i);
    });
  });
});
