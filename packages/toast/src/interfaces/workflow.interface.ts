export interface WorkflowStep<T, R = T> {
  name: string;
  handler: (input: T) => Promise<R>;
  emitEvent?: string | ((data: R) => string);
}
