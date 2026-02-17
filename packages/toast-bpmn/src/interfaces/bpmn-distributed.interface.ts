export interface SerializedContext {
  processId: string;
  processName: string;
  contextKey: string;
  data: string; // JSON serialized
}

export interface DistributedTaskPayload<T = unknown> {
  processId: string;
  processName: string;
  taskId: string;
  taskName: string;
  chainEventName: string;
  input: T;
  contextKey: string;
  retryCount: number;
}

export interface TaskResult<T = unknown> {
  taskId: string;
  processId: string;
  success: boolean;
  output?: T;
  error?: string;
  duration: number;
}
