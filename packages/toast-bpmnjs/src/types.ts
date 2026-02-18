import type { IToastBpmnPlugin } from './plugin/plugin-interface';

export interface ValidationResult {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  element?: string;
}

export interface BpmnEditorProps {
  xml?: string;
  onXmlChange?: (xml: string) => void;
  plugin?: IToastBpmnPlugin;
  height?: string | number;
  width?: string | number;
  onElementSelected?: (element: unknown) => void;
  onReady?: () => void;
}

export interface UseBpmnEditorOptions {
  xml?: string;
  onXmlChange?: (xml: string) => void;
}

export interface UseBpmnEditorResult {
  modeler: unknown | null;
  importXml: (xml: string) => Promise<void>;
  exportXml: () => Promise<string>;
  getElement: (id: string) => unknown | undefined;
}

export interface TaskConfigAttributes {
  chainEventName?: string;
  inputType?: string;
  outputType?: string;
  timeout?: number;
  typeConstraints?: TypeConstraintAttributes[];
}

export interface TypeConstraintAttributes {
  typeName: string;
  required: boolean;
}

export interface ProcessConfigAttributes {
  version?: string;
  description?: string;
  retryMaxRetries?: number;
  retryBackoffMs?: number;
  retryBackoffMultiplier?: number;
}
