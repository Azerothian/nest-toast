import { describe, it, expect } from 'vitest';
import { BpmnExecutionError } from '../../../errors/bpmn-execution.error';

describe('BpmnExecutionError', () => {
  it('sets name, message, processId, processName', () => {
    const err = new BpmnExecutionError({
      message: 'task failed',
      processId: 'proc-1',
      processName: 'MyProcess',
    });
    expect(err.name).toBe('BpmnExecutionError');
    expect(err.message).toBe('task failed');
    expect(err.processId).toBe('proc-1');
    expect(err.processName).toBe('MyProcess');
  });

  it('sets optional taskId and context', () => {
    const err = new BpmnExecutionError({
      message: 'failed',
      processId: 'p',
      processName: 'P',
      taskId: 'task-1',
      context: { foo: 'bar' },
    });
    expect(err.taskId).toBe('task-1');
    expect(err.context).toEqual({ foo: 'bar' });
  });

  it('stores originalError and appends caused-by stack', () => {
    const original = new Error('root cause');
    const err = new BpmnExecutionError({
      message: 'wrapper',
      processId: 'p',
      processName: 'P',
      originalError: original,
    });
    expect(err.originalError).toBe(original);
    expect(err.stack).toContain('Caused by:');
  });

  it('does not append caused-by when originalError has no stack', () => {
    const original = new Error('no stack');
    original.stack = undefined;
    const err = new BpmnExecutionError({
      message: 'wrapper',
      processId: 'p',
      processName: 'P',
      originalError: original,
    });
    expect(err.stack).not.toContain('Caused by:');
  });

  it('toJSON returns expected shape', () => {
    const err = new BpmnExecutionError({
      message: 'failed',
      processId: 'proc-1',
      processName: 'MyProcess',
      taskId: 'task-2',
      context: { key: 'val' },
    });
    const json = err.toJSON();
    expect(json).toEqual({
      name: 'BpmnExecutionError',
      message: 'failed',
      processId: 'proc-1',
      processName: 'MyProcess',
      taskId: 'task-2',
      context: { key: 'val' },
    });
  });

  it('is instance of Error', () => {
    const err = new BpmnExecutionError({ message: 'x', processId: 'p', processName: 'P' });
    expect(err).toBeInstanceOf(Error);
  });
});
