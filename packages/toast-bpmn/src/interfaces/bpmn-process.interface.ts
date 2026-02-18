import { BpmnTaskDefinition } from './bpmn-task.interface';
import { BpmnSequenceFlow, BpmnStartEvent, BpmnEndEvent } from './bpmn-flow.interface';

export interface RetryPolicy {
  maxRetries: number;
  backoffMs?: number;
  backoffMultiplier?: number;
}

export type ExecutionType = 'sync' | 'async';
export type ProcessingMode = 'sequential' | 'distributed';

export interface BpmnProcessOptions {
  name: string;
  description?: string;
  version?: string;
  retryPolicy?: RetryPolicy;
  bpmnFile?: string;
  executionType?: ExecutionType;
  processingMode?: ProcessingMode;
  timeout?: number;
}

export type GatewayType = 'exclusive' | 'parallel' | 'inclusive';

export interface BpmnGatewayDefinition {
  id: string;
  name?: string;
  type: GatewayType;
  incoming: string[];
  outgoing: string[];
  default?: string; // default flow ID for exclusive gateways
}

export interface BpmnProcessDefinition<
  C = Record<string, unknown>,
  I = unknown,
  O = unknown,
> {
  name: string;
  description?: string;
  version?: string;
  retryPolicy?: RetryPolicy;
  tasks: BpmnTaskDefinition[];
  flows: BpmnSequenceFlow[];
  startEvents: BpmnStartEvent[];
  endEvents: BpmnEndEvent[];
  gateways: BpmnGatewayDefinition[];
  source?: string; // file path
  bpmnFile?: string;
  definitions?: unknown; // raw bpmn-moddle definitions object
  executionType?: ExecutionType;
  processingMode?: ProcessingMode;
  contextType?: string;
  inputType?: string;
  outputType?: string;
}
