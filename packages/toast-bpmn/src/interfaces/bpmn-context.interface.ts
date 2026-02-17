export interface StepHistoryEntry {
  taskId: string;
  taskName: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  error?: Error;
  output?: unknown;
}

export interface BaseBpmnContext<T = Record<string, unknown>> {
  processId: string;
  processName: string;
  currentStep: string;
  stepHistory: StepHistoryEntry[];
  data: T;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  metadata: Record<string, unknown>;
}
