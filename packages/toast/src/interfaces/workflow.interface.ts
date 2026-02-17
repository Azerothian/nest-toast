export interface WorkflowStep<T, R = T, TArgs extends unknown[] = []> {
  name: string;
  handler: (input: T, ...initialArgs: TArgs) => Promise<R>;
  emitEvent?: string | ((data: R) => string);
}
