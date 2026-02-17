export interface TaskTiming {
  taskId: string;
  taskName: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
}

export interface ProcessTiming {
  processId: string;
  processName: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
  tasks: TaskTiming[];
}
