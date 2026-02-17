export interface DependencyCycleErrorOpts {
  message: string;
  result: string[];
  adjacencyList: Map<string, string[]>;
  missingVertices: string[];
}

export class DependencyCycleError extends Error {
  result: string[];
  adjacencyList: Map<string, string[]>;
  missingVertices: string[];

  constructor(opts: DependencyCycleErrorOpts) {
    super(opts.message);
    this.name = 'DependencyCycleError';
    this.result = opts.result;
    this.adjacencyList = opts.adjacencyList;
    this.missingVertices = opts.missingVertices;
  }
}
