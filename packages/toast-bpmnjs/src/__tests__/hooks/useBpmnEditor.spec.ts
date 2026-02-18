import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockDestroy = vi.fn();
const mockImportXML = vi.fn().mockResolvedValue({});
const mockSaveXML = vi.fn().mockResolvedValue({ xml: '<xml/>' });
const mockGet = vi.fn();
const mockOn = vi.fn();

vi.mock('bpmn-js/lib/Modeler', () => {
  return {
    default: class MockModeler {
      destroy = mockDestroy;
      importXML = mockImportXML;
      saveXML = mockSaveXML;
      get = mockGet;
      on = mockOn;
      constructor(_options?: any) {}
    },
  };
});

import { useBpmnEditor } from '../../hooks/useBpmnEditor';

describe('useBpmnEditor', () => {
  beforeEach(() => {
    mockDestroy.mockClear();
    mockImportXML.mockClear().mockResolvedValue({});
    mockSaveXML.mockClear().mockResolvedValue({ xml: '<xml/>' });
    mockGet.mockClear();
    mockOn.mockClear();
  });

  it('should initialize and return hook result', () => {
    const { result } = renderHook(() => useBpmnEditor());

    expect(result.current.importXml).toBeInstanceOf(Function);
    expect(result.current.exportXml).toBeInstanceOf(Function);
    expect(result.current.getElement).toBeInstanceOf(Function);
  });

  it('should call destroy on unmount', () => {
    const { unmount } = renderHook(() => useBpmnEditor());
    unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('should import XML', async () => {
    const { result } = renderHook(() => useBpmnEditor());

    await act(async () => {
      await result.current.importXml('<xml/>');
    });

    expect(mockImportXML).toHaveBeenCalledWith('<xml/>');
  });

  it('should export XML', async () => {
    const { result } = renderHook(() => useBpmnEditor());

    let xml: string = '';
    await act(async () => {
      xml = await result.current.exportXml();
    });

    expect(mockSaveXML).toHaveBeenCalledWith({ format: true });
    expect(xml).toBe('<xml/>');
  });

  it('should get element by id', () => {
    const mockElement = { id: 'task1', type: 'bpmn:ServiceTask' };
    mockGet.mockImplementation((service: string) => {
      if (service === 'elementRegistry') {
        return { get: (id: string) => (id === 'task1' ? mockElement : undefined) };
      }
      return undefined;
    });

    const { result } = renderHook(() => useBpmnEditor());
    const element = result.current.getElement('task1');
    expect(element).toBe(mockElement);
  });

  it('should register onXmlChange callback', () => {
    const onXmlChange = vi.fn();
    renderHook(() => useBpmnEditor({ onXmlChange }));

    expect(mockOn).toHaveBeenCalledWith('commandStack.changed', expect.any(Function));
  });
});
