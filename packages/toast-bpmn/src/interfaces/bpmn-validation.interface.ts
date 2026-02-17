export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  taskId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  taskId?: string;
}

export interface TypeConstraint {
  typeName: string;
  required?: boolean;
  properties?: Record<string, { type: string; required?: boolean }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
