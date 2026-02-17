import { describe, it, expect } from 'vitest';
import { BpmnLoaderError } from '../../../errors/bpmn-loader.error';

describe('BpmnLoaderError', () => {
  it('sets name and message', () => {
    const err = new BpmnLoaderError('file not found');
    expect(err.name).toBe('BpmnLoaderError');
    expect(err.message).toBe('file not found');
  });

  it('stores optional filePath', () => {
    const err = new BpmnLoaderError('parse error', '/path/to/file.bpmn');
    expect(err.filePath).toBe('/path/to/file.bpmn');
  });

  it('filePath is undefined when not provided', () => {
    const err = new BpmnLoaderError('error');
    expect(err.filePath).toBeUndefined();
  });

  it('stores originalError and appends caused-by stack', () => {
    const original = new Error('underlying io error');
    const err = new BpmnLoaderError('load failed', '/file.bpmn', original);
    expect(err.originalError).toBe(original);
    expect(err.stack).toContain('Caused by:');
  });

  it('does not append caused-by when originalError has no stack', () => {
    const original = new Error('no stack');
    original.stack = undefined;
    const err = new BpmnLoaderError('load failed', '/file.bpmn', original);
    expect(err.stack).not.toContain('Caused by:');
  });

  it('toJSON returns expected shape', () => {
    const err = new BpmnLoaderError('failed', '/my/file.bpmn');
    const json = err.toJSON();
    expect(json).toEqual({
      name: 'BpmnLoaderError',
      message: 'failed',
      filePath: '/my/file.bpmn',
    });
  });

  it('toJSON omits filePath when not provided', () => {
    const err = new BpmnLoaderError('failed');
    const json = err.toJSON();
    expect(json.filePath).toBeUndefined();
  });

  it('is instance of Error', () => {
    const err = new BpmnLoaderError('x');
    expect(err).toBeInstanceOf(Error);
  });
});
