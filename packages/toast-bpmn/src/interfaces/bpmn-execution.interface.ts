export type ProcessStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ProcessStartResult {
  processId: string;
  processName: string;
  status: ProcessStatus;
}

export interface AsyncExecutionResult extends ProcessStartResult {
  messageId?: string; // BullMQ job ID for distributed mode
  startedAt: Date;
}

export interface ProcessStatusInfo {
  status: ProcessStatus;
  currentStep?: string;
}
