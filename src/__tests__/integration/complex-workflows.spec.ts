import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { ToastModule } from '../../toast.module';
import { ChainExecutorService } from '../../services/chain-executor.service';
import { ChainContextService } from '../../services/chain-context.service';
import { WorkflowExecutorService } from '../../services/workflow-executor.service';
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { Plugin } from '../../decorators/plugin.decorator';
import { OnChainEvent } from '../../decorators/on-chain-event.decorator';

describe('Complex Workflow Integration', () => {
  let app: TestingModule;

  afterEach(async () => {
    if (app) await app.close();
  });

  describe('ChainExecutorService via NestJS', () => {
    beforeEach(async () => {
      app = await Test.createTestingModule({
        imports: [ToastModule.forRoot()],
      }).compile();
    });

    it('should execute waterfall chain', async () => {
      const executor = app.get<ChainExecutorService>(ChainExecutorService);
      const result = await executor.waterfall(1, [
        async (n) => n + 1,
        async (n) => n * 2,
        async (n) => n + 10,
      ]);
      expect(result).toBe(14);
    });

    it('should execute parallel chain', async () => {
      const executor = app.get<ChainExecutorService>(ChainExecutorService);
      const results = await executor.parallel<string, unknown>('test', [
        async (s) => s.toUpperCase(),
        async (s) => s.length,
        async (s) => s.repeat(2),
      ]);
      expect(results).toEqual(['TEST', 4, 'testtest']);
    });

    it('should execute race returning fastest', async () => {
      const executor = app.get<ChainExecutorService>(ChainExecutorService);
      const result = await executor.race(5, [
        async (n) => { await new Promise(r => setTimeout(r, 100)); return n * 2; },
        async (n) => n + 1,
      ]);
      expect(result).toBe(6);
    });

    it('should execute pipeline with timing', async () => {
      const executor = app.get<ChainExecutorService>(ChainExecutorService);
      const { output, timing } = await executor.pipeline<number, number>(0, [
        { name: 'add', handler: async (n) => (n as number) + 5 },
        { name: 'mul', handler: async (n) => (n as number) * 2 },
      ]);
      expect(output).toBe(10);
      expect(timing.has('add')).toBe(true);
      expect(timing.has('mul')).toBe(true);
    });

    it('should support chain cancellation', async () => {
      const executor = app.get<ChainExecutorService>(ChainExecutorService);
      const context = app.get<ChainContextService>(ChainContextService);
      const executed: number[] = [];

      await executor.waterfall(1, [
        async (n) => { executed.push(1); return n + 1; },
        async (n) => { executed.push(2); context.cancel(new Error('stop')); return n; },
        async (n) => { executed.push(3); return n; },
      ]);

      expect(executed).toEqual([1, 2]);
      expect(context.isCancelled()).toBe(true);
    });
  });

  describe('WorkflowExecutorService with @OnChainEvent plugins', () => {
    it('should dispatch @OnChainEvent handlers in dependency order', async () => {
      const callOrder: string[] = [];

      @Plugin({ name: 'wf-base-plugin', version: '1.0.0' })
      @Injectable()
      class WfBasePlugin {
        @OnChainEvent('wf:process')
        async handle(data: { value: number }) {
          callOrder.push('wf-base-plugin');
          return { ...data, base: true };
        }
      }

      @Plugin({ name: 'wf-dep-plugin', version: '1.0.0', dependencies: ['wf-base-plugin'] })
      @Injectable()
      class WfDepPlugin {
        @OnChainEvent('wf:process')
        async handle(data: { value: number; base?: boolean }) {
          callOrder.push('wf-dep-plugin');
          return { ...data, dep: true };
        }
      }

      app = await Test.createTestingModule({
        imports: [ToastModule.forRoot()],
        providers: [WfBasePlugin, WfDepPlugin],
      }).compile();
      await app.init();

      const workflow = app.get<WorkflowExecutorService>(WorkflowExecutorService);
      const result = await workflow.executeWorkflow('test', { value: 1 }, [
        {
          name: 'process',
          handler: async (d) => d,
          emitEvent: 'wf:process',
        },
      ]);

      expect(callOrder.indexOf('wf-base-plugin')).toBeLessThan(
        callOrder.indexOf('wf-dep-plugin')
      );
      expect(result).toMatchObject({ value: 1, base: true, dep: true });
    });

    it('should execute workflow with multiple steps and event emission', async () => {
      app = await Test.createTestingModule({
        imports: [ToastModule.forRoot()],
      }).compile();

      const workflow = app.get<WorkflowExecutorService>(WorkflowExecutorService);
      const result = await workflow.executeWorkflow('multi', { value: 0 }, [
        { name: 'step1', handler: async (d) => ({ ...(d as object), step1: true }), emitEvent: 'step1:done' },
        { name: 'step2', handler: async (d) => ({ ...(d as object), step2: true }), emitEvent: 'step2:done' },
        { name: 'step3', handler: async (d) => ({ ...(d as object), step3: true }) },
      ]);

      expect(result).toEqual({ value: 0, step1: true, step2: true, step3: true });
    });

    it('should support cancellation via @OnChainEvent handler', async () => {
      @Plugin({ name: 'cancelling-plugin', version: '1.0.0' })
      @Injectable()
      class CancellingPlugin {
        constructor(private readonly context: ChainContextService) {}

        @OnChainEvent('cancel:test')
        async handle(data: unknown) {
          this.context.cancel(new Error('cancelled by plugin'));
          return data;
        }
      }

      app = await Test.createTestingModule({
        imports: [ToastModule.forRoot()],
        providers: [CancellingPlugin],
      }).compile();
      await app.init();

      const workflow = app.get<WorkflowExecutorService>(WorkflowExecutorService);
      const context = app.get<ChainContextService>(ChainContextService);

      const step2Executed = { value: false };
      await workflow.executeWorkflow('cancel-wf', {}, [
        { name: 'step1', handler: async (d) => d, emitEvent: 'cancel:test' },
        {
          name: 'step2',
          handler: async (d) => { step2Executed.value = true; return d; },
          emitEvent: 'step2:event',
        },
      ]);

      expect(context.isCancelled()).toBe(true);
      expect(step2Executed.value).toBe(false);
    });
  });

  describe('performance', () => {
    beforeEach(async () => {
      app = await Test.createTestingModule({
        imports: [ToastModule.forRoot()],
      }).compile();
    });

    it('should execute 100 parallel handlers within 1 second', async () => {
      const executor = app.get<ChainExecutorService>(ChainExecutorService);
      const handlers = Array.from({ length: 100 }, (_, i) =>
        async (input: number) => input + i
      );

      const start = Date.now();
      const results = await executor.parallel(0, handlers);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(100);
    });
  });
});
