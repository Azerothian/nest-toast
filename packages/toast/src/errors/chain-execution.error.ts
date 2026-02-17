import type { ExecutionTrace } from '../interfaces/execution-tracking.interface';

export class ChainExecutionError extends Error {
  originalError: Error;
  executionTrace: ExecutionTrace;
  formattedTrace: string;

  constructor(originalError: Error, executionTrace: ExecutionTrace) {
    super(originalError.message);
    this.name = 'ChainExecutionError';
    this.originalError = originalError;
    this.executionTrace = executionTrace;
    this.formattedTrace = this.formatCompact();
  }

  private formatCompact(): string {
    const { handlers, startTime, endTime } = this.executionTrace;
    const duration = endTime !== undefined ? endTime - startTime : 0;
    const handlerSummary = handlers
      .map(h => `${h.handlerName}(${h.duration ?? '?'}ms)`)
      .join(' -> ');
    return `ChainExecutionError: ${this.originalError.message}\n  Trace: ${handlerSummary}\n  Duration: ${duration}ms`;
  }

  formatTimeline(): string {
    const { handlers, startTime } = this.executionTrace;
    const lines = handlers.map(h => {
      const offset = h.startTime - startTime;
      return `  +${offset}ms ${h.handlerName} (${h.duration ?? '?'}ms) ${h.success ? 'ok' : 'FAILED'}`;
    });
    return `ChainExecutionError Timeline:\n${lines.join('\n')}`;
  }

  formatJson(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      originalError: {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      },
      executionTrace: {
        startTime: this.executionTrace.startTime,
        endTime: this.executionTrace.endTime,
        eventName: this.executionTrace.eventName,
        workflowName: this.executionTrace.workflowName,
        handlers: this.executionTrace.handlers.map(h => ({
          handlerName: h.handlerName,
          startTime: h.startTime,
          endTime: h.endTime,
          duration: h.duration,
          success: h.success,
          error: h.error ? { name: h.error.name, message: h.error.message } : undefined,
        })),
      },
    };
  }
}
