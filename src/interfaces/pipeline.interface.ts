export interface PipelineStage<TIn, TOut> {
  name: string;
  handler: (input: TIn) => Promise<TOut>;
}

export interface PipelineResult<TOut> {
  output: TOut;
  timing: Map<string, number>;
}
