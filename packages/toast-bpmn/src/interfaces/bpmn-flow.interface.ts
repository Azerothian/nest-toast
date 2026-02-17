export interface BpmnSequenceFlow {
  id: string;
  name?: string;
  sourceRef: string;
  targetRef: string;
  conditionExpression?: string;
}

export interface BpmnStartEvent {
  id: string;
  name?: string;
  outgoing: string[]; // flow IDs
}

export interface BpmnEndEvent {
  id: string;
  name?: string;
  incoming: string[]; // flow IDs
}
