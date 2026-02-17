import { describe, it, expect } from 'vitest';
import { ChainExecutionError } from '../../errors/chain-execution.error';
import type { ExecutionTrace } from '../../interfaces/execution-tracking.interface';

describe('ChainExecutionError', () => {
  const makeTrace = (overrides?: Partial<ExecutionTrace>): ExecutionTrace => ({
    startTime: 1000,
    endTime: 2000,
    handlers: [
      { handlerName: 'handler1', startTime: 1000, endTime: 1100, duration: 100, success: true },
      { handlerName: 'handler2', startTime: 1100, endTime: 1200, duration: 100, success: false },
    ],
    ...overrides,
  });

  it('should be an instance of Error', () => {
    const err = new ChainExecutionError(new Error('test'), makeTrace());
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ChainExecutionError);
  });

  it('should have name ChainExecutionError', () => {
    const err = new ChainExecutionError(new Error('test'), makeTrace());
    expect(err.name).toBe('ChainExecutionError');
  });

  it('should preserve originalError', () => {
    const original = new Error('original message');
    const err = new ChainExecutionError(original, makeTrace());
    expect(err.originalError).toBe(original);
    expect(err.message).toBe('original message');
  });

  it('should preserve executionTrace', () => {
    const trace = makeTrace();
    const err = new ChainExecutionError(new Error('test'), trace);
    expect(err.executionTrace).toBe(trace);
  });

  it('should generate formattedTrace containing handler names', () => {
    const err = new ChainExecutionError(new Error('test'), makeTrace());
    expect(err.formattedTrace).toContain('handler1');
    expect(err.formattedTrace).toContain('handler2');
  });

  it('should include duration in formattedTrace', () => {
    const err = new ChainExecutionError(new Error('test'), makeTrace());
    expect(err.formattedTrace).toContain('100ms');
  });

  it('should include total duration in formattedTrace', () => {
    const err = new ChainExecutionError(new Error('test'), makeTrace());
    expect(err.formattedTrace).toContain('1000ms'); // endTime - startTime = 2000 - 1000
  });

  it('should handle missing endTime in formattedTrace', () => {
    const trace = makeTrace({ endTime: undefined });
    const err = new ChainExecutionError(new Error('test'), trace);
    expect(err.formattedTrace).toContain('0ms'); // duration = 0 when no endTime
  });

  it('should generate timeline format', () => {
    const err = new ChainExecutionError(new Error('test'), makeTrace());
    const timeline = err.formatTimeline();
    expect(timeline).toContain('Timeline');
    expect(timeline).toContain('handler1');
    expect(timeline).toContain('handler2');
  });

  it('should generate JSON format', () => {
    const err = new ChainExecutionError(new Error('test'), makeTrace());
    const json = err.formatJson();
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('ChainExecutionError');
    expect(parsed.originalError.message).toBe('test');
  });

  it('should serialize to JSON via toJSON()', () => {
    const original = new Error('original');
    const trace = makeTrace();
    const err = new ChainExecutionError(original, trace);
    const json = err.toJSON() as Record<string, unknown>;

    expect(json.name).toBe('ChainExecutionError');
    expect(json.message).toBe('original');
    const origJson = json.originalError as Record<string, unknown>;
    expect(origJson.name).toBe('Error');
    expect(origJson.message).toBe('original');
    const traceJson = json.executionTrace as Record<string, unknown>;
    expect(traceJson.startTime).toBe(1000);
  });

  it('should include handler error in toJSON()', () => {
    const handlerError = new Error('handler failed');
    const trace = makeTrace({
      handlers: [
        {
          handlerName: 'failing',
          startTime: 1000,
          endTime: 1050,
          duration: 50,
          success: false,
          error: handlerError,
        },
      ],
    });
    const err = new ChainExecutionError(new Error('test'), trace);
    const json = err.toJSON() as Record<string, unknown>;
    const handlers = (json.executionTrace as Record<string, unknown>).handlers as Array<Record<string, unknown>>;
    expect(handlers[0].error).toBeDefined();
    const errObj = handlers[0].error as Record<string, unknown>;
    expect(errObj.message).toBe('handler failed');
  });
});
