import { describe, it, expect } from 'vitest';
import { BpmnValidationError } from '../../../errors/bpmn-validation.error';
import type { ValidationErrorDetail, ValidationWarningDetail } from '../../../errors/bpmn-validation.error';

describe('BpmnValidationError', () => {
  const errors: ValidationErrorDetail[] = [
    { code: 'E001', message: 'missing chainEventName', taskId: 'task-1' },
    { code: 'E002', message: 'invalid process structure' },
  ];

  it('sets name and formats message from errors', () => {
    const err = new BpmnValidationError(errors);
    expect(err.name).toBe('BpmnValidationError');
    expect(err.message).toBe(
      'BPMN validation failed with 2 error(s): missing chainEventName; invalid process structure',
    );
  });

  it('stores errors array', () => {
    const err = new BpmnValidationError(errors);
    expect(err.errors).toHaveLength(2);
    expect(err.errors[0].code).toBe('E001');
    expect(err.errors[1].taskId).toBeUndefined();
  });

  it('defaults warnings to empty array', () => {
    const err = new BpmnValidationError(errors);
    expect(err.warnings).toEqual([]);
  });

  it('stores provided warnings', () => {
    const warnings: ValidationWarningDetail[] = [
      { code: 'W001', message: 'deprecated field', path: '/process/task' },
    ];
    const err = new BpmnValidationError(errors, warnings);
    expect(err.warnings).toHaveLength(1);
    expect(err.warnings[0].code).toBe('W001');
  });

  it('toJSON returns expected shape', () => {
    const warnings: ValidationWarningDetail[] = [{ code: 'W001', message: 'warn' }];
    const err = new BpmnValidationError(errors, warnings);
    const json = err.toJSON();
    expect(json.name).toBe('BpmnValidationError');
    expect(json.errors).toHaveLength(2);
    expect(json.warnings).toHaveLength(1);
  });

  it('is instance of Error', () => {
    const err = new BpmnValidationError(errors);
    expect(err).toBeInstanceOf(Error);
  });
});
