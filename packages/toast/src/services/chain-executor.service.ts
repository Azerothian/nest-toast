import { Injectable } from '@nestjs/common';
import { ChainContextService } from './chain-context.service';
import { ChainExecutionError } from '../errors/chain-execution.error';
import type { ChainHandler } from '../interfaces/chain-context.interface';
import type { PipelineStage, PipelineResult } from '../interfaces/pipeline.interface';
import type { ExecutionTrace, HandlerExecutionRecord } from '../interfaces/execution-tracking.interface';

export interface WaterfallOptions {
  timeout?: number;
}

export interface ParallelOptions {
  concurrency?: number;
}

@Injectable()
export class ChainExecutorService {
  constructor(private readonly chainContext: ChainContextService) {}

  async waterfall<T, TArgs extends unknown[] = []>(
    initial: T,
    handlers: ChainHandler<T, T, TArgs>[],
    options?: WaterfallOptions,
    ...initialArgs: TArgs
  ): Promise<T> {
    const result = await this.chainContext.run(async () => {
      let current = initial;
      const trace: ExecutionTrace = {
        startTime: Date.now(),
        handlers: [],
      };

      for (let i = 0; i < handlers.length; i++) {
        if (this.chainContext.isCancelled() || this.chainContext.isFinished()) {
          break;
        }

        const handler = handlers[i];
        const handlerName = handler.name || `handler_${i}`;
        const record: HandlerExecutionRecord = {
          handlerName,
          startTime: Date.now(),
          success: false,
        };
        trace.handlers.push(record);

        try {
          current = await this.executeWithTimeout(
            handler,
            current,
            handlerName,
            options?.timeout,
            ...initialArgs,
          );
          record.endTime = Date.now();
          record.duration = record.endTime - record.startTime;
          record.success = true;
        } catch (err) {
          record.endTime = Date.now();
          record.duration = record.endTime - record.startTime;
          record.success = false;
          record.error = err instanceof Error ? err : new Error(String(err));
          trace.endTime = Date.now();

          // Store trace in context for inspection
          const ctx = this.chainContext.getContext();
          if (ctx) ctx.executionTrace = trace;

          throw new ChainExecutionError(record.error, trace);
        }
      }

      trace.endTime = Date.now();

      // Store completed trace in context
      const ctx = this.chainContext.getContext();
      if (ctx) ctx.executionTrace = trace;

      return current;
    });

    // Propagate any cancellation/finish from inner run to outer context (if nested)
    this.chainContext.propagateLastToCurrent();

    return result;
  }

  private executeWithTimeout<T, TArgs extends unknown[] = []>(
    handler: ChainHandler<T, T, TArgs>,
    input: T,
    name: string,
    timeout?: number,
    ...initialArgs: TArgs
  ): Promise<T> {
    if (!timeout) return handler(input, ...initialArgs);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout: handler "${name}" exceeded ${timeout}ms`));
      }, timeout);

      handler(input, ...initialArgs)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  async parallel<T, R = T, TArgs extends unknown[] = []>(
    input: T,
    handlers: ChainHandler<T, R, TArgs>[],
    options?: ParallelOptions,
    ...initialArgs: TArgs
  ): Promise<R[]> {
    if (!options?.concurrency) {
      return Promise.all(handlers.map(h => h(input, ...initialArgs)));
    }

    const results: R[] = new Array(handlers.length);
    const concurrency = options.concurrency;
    let index = 0;

    const worker = async (): Promise<void> => {
      while (index < handlers.length) {
        const i = index++;
        results[i] = await handlers[i](input, ...initialArgs);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, handlers.length) }, () => worker()),
    );

    return results;
  }

  async race<T, R = T, TArgs extends unknown[] = []>(
    input: T,
    handlers: ChainHandler<T, R, TArgs>[],
    ...initialArgs: TArgs
  ): Promise<R> {
    return Promise.race(handlers.map(h => h(input, ...initialArgs)));
  }

  async allSettled<T, R = T, TArgs extends unknown[] = []>(
    input: T,
    handlers: ChainHandler<T, R, TArgs>[],
    ...initialArgs: TArgs
  ): Promise<PromiseSettledResult<R>[]> {
    return Promise.allSettled(handlers.map(h => h(input, ...initialArgs)));
  }

  async pipeline<TIn, TOut, TArgs extends unknown[] = []>(
    input: TIn,
    stages: PipelineStage<unknown, unknown, TArgs>[],
    ...initialArgs: TArgs
  ): Promise<PipelineResult<TOut>> {
    const timing = new Map<string, number>();
    let current: unknown = input;

    for (const stage of stages) {
      const start = Date.now();
      current = await stage.handler(current, ...initialArgs);
      timing.set(stage.name, Date.now() - start);
    }

    return { output: current as TOut, timing };
  }
}
