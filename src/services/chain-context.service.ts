import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import type { ChainContext } from '../interfaces/chain-context.interface';
import type { ChainEvent } from '../interfaces/chain-event.interface';
import type { ExecutionTrace } from '../interfaces/execution-tracking.interface';

@Injectable()
export class ChainContextService {
  private readonly storage = new AsyncLocalStorage<ChainContext>();
  private _lastContext: ChainContext | undefined;

  run<T>(fn: () => Promise<T>): Promise<T> {
    const context: ChainContext = {
      cancelled: false,
      finished: false,
      results: new Map(),
      trackingEnabled: false,
    };
    this._lastContext = context;
    return this.storage.run(context, fn);
  }

  private getStore(): ChainContext | undefined {
    return this.storage.getStore() ?? this._lastContext;
  }

  cancel(reason?: Error): void {
    const ctx = this.getStore();
    if (ctx) {
      ctx.cancelled = true;
      ctx.cancelReason = reason;
    }
  }

  isCancelled(): boolean {
    return this.getStore()?.cancelled ?? false;
  }

  finish(): void {
    const ctx = this.getStore();
    if (ctx) {
      ctx.finished = true;
    }
  }

  isFinished(): boolean {
    return this.getStore()?.finished ?? false;
  }

  getContext(): ChainContext | undefined {
    return this.storage.getStore();
  }

  getReason(): Error | undefined {
    return this.getStore()?.cancelReason;
  }

  setResult(key: string, value: unknown): void {
    const ctx = this.getStore();
    if (ctx) {
      ctx.results.set(key, value);
    }
  }

  getResult<T>(key: string): T | undefined {
    return this.getStore()?.results.get(key) as T | undefined;
  }

  getCurrentEvent(): ChainEvent<unknown> | undefined {
    return this.getStore()?.currentEvent;
  }

  setCurrentEvent(event: ChainEvent<unknown>): void {
    const ctx = this.getStore();
    if (ctx) {
      ctx.currentEvent = event;
    }
  }

  getExecutionTrace(): ExecutionTrace | undefined {
    return this.getStore()?.executionTrace;
  }

  setTrackingEnabled(enabled: boolean): void {
    const ctx = this.getStore();
    if (ctx) {
      ctx.trackingEnabled = enabled;
    }
  }

  isTrackingEnabled(): boolean {
    return this.getStore()?.trackingEnabled ?? false;
  }

  recordHandlerStart(handlerName: string): void {
    const ctx = this.storage.getStore();
    if (!ctx) return;
    if (!ctx.executionTrace) {
      ctx.executionTrace = {
        startTime: Date.now(),
        handlers: [],
      };
    }
    ctx.executionTrace.handlers.push({
      handlerName,
      startTime: Date.now(),
      success: false,
    });
  }

  /**
   * Propagates cancellation/finish state from the last completed run()
   * to the currently active run(). Called by waterfall after inner run exits.
   */
  propagateLastToCurrent(): void {
    const current = this.storage.getStore();
    if (!current || !this._lastContext || current === this._lastContext) return;
    if (this._lastContext.cancelled) {
      current.cancelled = true;
      current.cancelReason = this._lastContext.cancelReason;
    }
    if (this._lastContext.finished) {
      current.finished = true;
    }
  }

  recordHandlerEnd(handlerName: string, success: boolean, error?: Error): void {
    const ctx = this.storage.getStore();
    if (!ctx || !ctx.executionTrace) return;

    const record = [...ctx.executionTrace.handlers]
      .reverse()
      .find(h => h.handlerName === handlerName && h.endTime === undefined);

    if (record) {
      record.endTime = Date.now();
      record.duration = record.endTime - record.startTime;
      record.success = success;
      record.error = error;
    }
  }
}
