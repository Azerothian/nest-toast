import { RetryPolicy } from './bpmn-process.interface';

export type BpmnTaskType =
  | 'serviceTask'
  | 'userTask'
  | 'scriptTask'
  | 'sendTask'
  | 'receiveTask'
  | 'manualTask'
  | 'businessRuleTask';

export interface BpmnTaskOptions {
  taskId: string;
  type?: BpmnTaskType;
  description?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  inputType?: string;
  outputType?: string;
  retryable?: boolean;
}

export interface BpmnTaskDefinition {
  id: string;
  name: string;
  type: BpmnTaskType;
  chainEventName?: string;
  description?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  inputType?: string;
  outputType?: string;
  incoming: string[];
  outgoing: string[];
  extensionElements?: Record<string, unknown>;
}
