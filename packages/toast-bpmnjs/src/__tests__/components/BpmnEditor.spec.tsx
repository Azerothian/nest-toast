import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BpmnEditor } from '../../components/BpmnEditor';

// Mock bpmn-js Modeler
const mockDestroy = vi.fn();
const mockImportXML = vi.fn().mockResolvedValue({});
const mockSaveXML = vi.fn().mockResolvedValue({ xml: '<xml/>' });
const mockCreateDiagram = vi.fn().mockResolvedValue({});
const mockOn = vi.fn();
const mockGet = vi.fn();

vi.mock('bpmn-js/lib/Modeler', () => ({
  default: vi.fn().mockImplementation(() => ({
    destroy: mockDestroy,
    importXML: mockImportXML,
    saveXML: mockSaveXML,
    createDiagram: mockCreateDiagram,
    on: mockOn,
    get: mockGet,
  })),
}));

vi.mock('bpmn-js-properties-panel', () => ({
  BpmnPropertiesPanelModule: {},
  BpmnPropertiesProviderModule: {},
}));

vi.mock('../../extensions/toast-properties-provider', () => ({
  toastPropertiesProviderModule: {},
}));

describe('BpmnEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('should render canvas and properties panel containers', () => {
    const { container } = render(<BpmnEditor />);

    const flexContainer = container.firstElementChild as HTMLElement;
    expect(flexContainer).toBeTruthy();
    expect(flexContainer.style.display).toBe('flex');

    // Should have canvas and panel divs
    const children = flexContainer.children;
    expect(children.length).toBe(2);
  });

  it('should accept height and width props', () => {
    const { container } = render(<BpmnEditor height="600px" width="800px" />);

    const flexContainer = container.firstElementChild as HTMLElement;
    expect(flexContainer.style.height).toBe('600px');
    expect(flexContainer.style.width).toBe('800px');
  });

  it('should destroy modeler on unmount', () => {
    const { unmount } = render(<BpmnEditor />);
    unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('should import XML when xml prop is provided', async () => {
    render(<BpmnEditor xml="<definitions/>" />);

    // Wait for async init
    await vi.waitFor(() => {
      expect(mockImportXML).toHaveBeenCalledWith('<definitions/>');
    });
  });

  it('should create diagram when no xml prop', async () => {
    render(<BpmnEditor />);

    await vi.waitFor(() => {
      expect(mockCreateDiagram).toHaveBeenCalled();
    });
  });
});
