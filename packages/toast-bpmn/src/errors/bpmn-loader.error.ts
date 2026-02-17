export class BpmnLoaderError extends Error {
  readonly filePath?: string;
  readonly originalError?: Error;

  constructor(message: string, filePath?: string, originalError?: Error) {
    super(message);
    this.name = 'BpmnLoaderError';
    this.filePath = filePath;
    this.originalError = originalError;
    if (originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      filePath: this.filePath,
    };
  }
}
