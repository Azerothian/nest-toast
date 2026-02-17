export interface ValidationErrorDetail {
  code: string;
  message: string;
  path?: string;
  taskId?: string;
}

export interface ValidationWarningDetail {
  code: string;
  message: string;
  path?: string;
  taskId?: string;
}

export class BpmnValidationError extends Error {
  readonly errors: ValidationErrorDetail[];
  readonly warnings: ValidationWarningDetail[];

  constructor(errors: ValidationErrorDetail[], warnings: ValidationWarningDetail[] = []) {
    const message = `BPMN validation failed with ${errors.length} error(s): ${errors.map(e => e.message).join('; ')}`;
    super(message);
    this.name = 'BpmnValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
}
