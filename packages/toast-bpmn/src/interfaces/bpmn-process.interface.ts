import { BpmnTaskDefinition } from './bpmn-task.interface';
import { BpmnSequenceFlow, BpmnStartEvent, BpmnEndEvent } from './bpmn-flow.interface';

export interface RetryPolicy {
  maxRetries: number;
  backoffMs?: number;
  backoffMultiplier?: number;
}

export interface BpmnProcessOptions {
  name: string;
  description?: string;
  version?: string;
  retryPolicy?: RetryPolicy;
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
  source?: string; // file path
}
