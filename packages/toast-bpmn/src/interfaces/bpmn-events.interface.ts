export interface ProcessStartedEvent {
  processId: string;
  processName: string;
  startedAt: Date;
}

export interface ProcessCompletedEvent {
  processId: string;
  processName: string;
  completedAt: Date;
  duration: number;
  output: unknown;
}

export interface ProcessFailedEvent {
  processId: string;
  processName: string;
  failedAt: Date;
  error: Error;
  taskId?: string;
}

export interface TaskStartedEvent {
  processId: string;
  taskId: string;
  taskName: string;
  startedAt: Date;
}

export interface TaskCompletedEvent {
  processId: string;
  taskId: string;
  taskName: string;
  completedAt: Date;
  duration: number;
  output: unknown;
}

export interface TaskFailedEvent {
  processId: string;
  taskId: string;
  taskName: string;
  failedAt: Date;
  error: Error;
}
