export class BpmnExecutionError extends Error {
  readonly taskId?: string;
  readonly processId: string;
  readonly processName: string;
  readonly context?: Record<string, unknown>;
  readonly originalError?: Error;

  constructor(options: {
    message: string;
    processId: string;
    processName: string;
    taskId?: string;
    context?: Record<string, unknown>;
    originalError?: Error;
  }) {
    super(options.message);
    this.name = 'BpmnExecutionError';
    this.processId = options.processId;
    this.processName = options.processName;
    this.taskId = options.taskId;
    this.context = options.context;
    this.originalError = options.originalError;
    if (options.originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.originalError.stack}`;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      processId: this.processId,
      processName: this.processName,
      taskId: this.taskId,
      context: this.context,
    };
  }
}
