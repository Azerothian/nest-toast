export interface TimerTriggerOptions {
  cron?: string;
  interval?: number; // ms
  delay?: number; // ms
  processName: string;
  timezone?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface RegisterTypeOptions {
  name?: string; // defaults to class.name
  schema?: Record<string, unknown>;
}
