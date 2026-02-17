export interface PipelineStage<TIn, TOut, TArgs extends unknown[] = []> {
  name: string;
  handler: (input: TIn, ...initialArgs: TArgs) => Promise<TOut>;
}

export interface PipelineResult<TOut> {
  output: TOut;
  timing: Map<string, number>;
}
