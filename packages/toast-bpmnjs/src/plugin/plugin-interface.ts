import type { ValidationResult } from '../types';

export interface IToastBpmnPlugin {
  loadDiagram?(diagramId: string): Promise<string>;
  saveDiagram?(diagramId: string, xml: string): Promise<void>;
  getChainEventNames?(): Promise<string[]>;
  getTypeNames?(): Promise<string[]>;
  validate?(xml: string): Promise<ValidationResult[]>;
  onDiagramChanged?(xml: string): void;
  onElementSelected?(element: unknown): void;
}
