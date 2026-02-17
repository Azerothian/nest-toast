export interface HandlerExecutionRecord {
  handlerName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: Error;
}

export interface ExecutionTrace {
  startTime: number;
  endTime?: number;
  handlers: HandlerExecutionRecord[];
  eventName?: string;
  workflowName?: string;
}

export interface ExecutionTrackingConfig {
  enabled: boolean;
  includeInput?: boolean;
  includeOutput?: boolean;
}
