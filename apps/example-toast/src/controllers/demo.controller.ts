import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  PluginRegistryService,
  ChainExecutorService,
} from '@azerothian/toast';
import { OrderProcessingWorkflow } from '../workflows/order-processing.workflow';
import type { OrderData } from '../plugins/validator.plugin';

@Controller('demo')
export class DemoController {
  constructor(
    private readonly pluginRegistry: PluginRegistryService,
    private readonly chainExecutor: ChainExecutorService,
    private readonly orderWorkflow: OrderProcessingWorkflow,
  ) {}

  @Get('plugins')
  listPlugins() {
    const plugins = this.pluginRegistry.getAllPlugins();
    return {
      count: plugins.length,
      plugins: plugins.map((p) => ({
        name: p.name,
        version: p.metadata.version,
        dependencies: p.metadata.dependencies || [],
        tags: p.metadata.tags || [],
      })),
    };
  }

  @Get('waterfall')
  async demoWaterfall() {
    const handlers = [
      async (n: number) => {
        console.log(`[Waterfall] Step 1: received ${n}`);
        return n + 10;
      },
      async (n: number) => {
        console.log(`[Waterfall] Step 2: received ${n}`);
        return n * 2;
      },
      async (n: number) => {
        console.log(`[Waterfall] Step 3: received ${n}`);
        return n - 5;
      },
    ];

    const result = await this.chainExecutor.waterfall(5, handlers);
    return {
      execution: 'waterfall',
      input: 5,
      steps: ['add 10', 'multiply by 2', 'subtract 5'],
      result,
      explanation: '(5 + 10) * 2 - 5 = 25',
    };
  }

  @Get('parallel')
  async demoParallel() {
    const handlers = [
      async (n: number) => {
        await delay(100);
        return { operation: 'double', result: n * 2 };
      },
      async (n: number) => {
        await delay(50);
        return { operation: 'square', result: n * n };
      },
      async (n: number) => {
        await delay(75);
        return { operation: 'addTen', result: n + 10 };
      },
    ];

    const start = Date.now();
    const results = await this.chainExecutor.parallel(5, handlers);
    const duration = Date.now() - start;

    return {
      execution: 'parallel',
      input: 5,
      results,
      duration: `${duration}ms`,
      note: 'All handlers executed concurrently',
    };
  }

  @Get('pipeline')
  async demoPipeline() {
    const stages = [
      {
        name: 'parse',
        handler: async (input: unknown) => {
          await delay(50);
          return JSON.parse(input as string);
        },
      },
      {
        name: 'validate',
        handler: async (data: unknown) => {
          await delay(30);
          const parsed = data as { value: number };
          if (parsed.value < 0) throw new Error('Value must be positive');
          return parsed;
        },
      },
      {
        name: 'transform',
        handler: async (data: unknown) => {
          await delay(40);
          const parsed = data as { value: number };
          return { ...parsed, doubled: parsed.value * 2 };
        },
      },
      {
        name: 'serialize',
        handler: async (data: unknown) => {
          await delay(20);
          return JSON.stringify(data);
        },
      },
    ];

    const result = await this.chainExecutor.pipeline<string, string>(
      '{"value": 42}',
      stages,
    );

    return {
      execution: 'pipeline',
      input: '{"value": 42}',
      stages: stages.map((s) => s.name),
      output: result.output,
      timing: Object.fromEntries(result.timing),
    };
  }

  @Get('race')
  async demoRace() {
    const handlers = [
      async (n: number) => {
        await delay(150);
        return { source: 'slow', result: n * 10 };
      },
      async (n: number) => {
        await delay(50);
        return { source: 'fast', result: n * 2 };
      },
      async (n: number) => {
        await delay(100);
        return { source: 'medium', result: n * 5 };
      },
    ];

    const start = Date.now();
    const result = await this.chainExecutor.race(5, handlers);
    const duration = Date.now() - start;

    return {
      execution: 'race',
      input: 5,
      winner: result,
      duration: `${duration}ms`,
      note: 'First handler to complete wins',
    };
  }

  @Post('order')
  async processOrder(@Body() orderData: OrderData) {
    try {
      const result = await this.orderWorkflow.processOrder(orderData);
      return {
        success: true,
        order: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
