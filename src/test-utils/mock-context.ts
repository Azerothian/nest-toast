import type { ChainContext } from '../interfaces/chain-context.interface';

export function createMockContext(overrides?: Partial<ChainContext>): ChainContext {
  return {
    cancelled: false,
    finished: false,
    results: new Map(),
    trackingEnabled: false,
    ...overrides,
  };
}
