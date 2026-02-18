export interface TaskTiming {
  taskId: string;
  taskName: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
  queueTime?: number; // ms - time spent waiting in queue (distributed mode)
}

export interface ProcessTiming {
  processId: string;
  processName: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
  totalDuration: number; // ms - wall-clock time including queue time
  queueTime?: number; // ms - time spent waiting in queue (distributed mode)
  executionTime: number; // ms - actual execution time excluding queue
  tasks: TaskTiming[];
}
