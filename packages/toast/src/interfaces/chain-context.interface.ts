import type { ChainEvent } from './chain-event.interface';
import type { ExecutionTrace } from './execution-tracking.interface';

export interface ChainContext {
  cancelled: boolean;
  cancelReason?: Error;
  finished: boolean;
  results: Map<string, unknown>;
  currentEvent?: ChainEvent<unknown>;
  executionTrace?: ExecutionTrace;
  trackingEnabled: boolean;
}

export type ChainHandler<T, R = T> = (input: T) => Promise<R>;
