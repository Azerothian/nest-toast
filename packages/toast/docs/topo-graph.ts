
  private adjacencyList: Map<number, number[]>;

  constructor() {
    this.adjacencyList = new Map<number, number[]>();
  }

  addVertex(vertex: number) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }

  addEdge(from: number, to: number) {
    if (this.adjacencyList.has(from)) {
      this.adjacencyList.get(from)?.push(to);
    } else {
      throw new Error(`Vertex ${from} does not exist in the graph.`);
    }
  }
  topologicalSort(): number[] {
    const indegree: Map<number, number> = new Map();
    const queue: number[] = [];
    const result: number[] = [];

    // Calculate indegree for each vertex
    for (const [vertex, neighbors] of this.adjacencyList) {
      indegree.set(vertex, indegree.get(vertex) || 0);
      for (const neighbor of neighbors) {
        indegree.set(neighbor, (indegree.get(neighbor) || 0) + 1);
      }
    }

    // Initialize the queue with vertices having indegree of 0
    for (const vertex of indegree.keys()) {
      if (indegree.get(vertex) === 0) {
        queue.push(vertex);
      }
    }

    // Topological sort using Kahn's algorithm
    while (queue.length > 0) {
      const vertex = queue.shift()!;
      result.push(vertex);

      const neighbors = this.adjacencyList.get(vertex) || [];
      for (const neighbor of neighbors) {
        indegree.set(neighbor, indegree.get(neighbor)! - 1);
        if (indegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== this.adjacencyList.size) {
      // get missing vertices
      const missingVertices = Array.from(this.adjacencyList.keys()).filter((vertex) => !result.includes(vertex));

      throw new AdjacencyError({
        message: "Graph has a cycle. Topological sorting is not possible.",
        result,
        adjacencyList: this.adjacencyList,
        missingVertices,
      });
    }

    return result;
  }
}

export interface AdjacencyErrorOpts {
  message: string;
  result: number[];
  adjacencyList: Map<number, number[]>;
  missingVertices: number[];
}

export class AdjacencyError extends Error {
  result: number[];
  adjacencyList: Map<number, number[]>
  missingVertices: number[];
  constructor(opts: AdjacencyErrorOpts) {
    super(opts.message);
    this.name = "AdjacencyError";
    this.message = opts.message;
    this.result = opts.result;
    this.adjacencyList = opts.adjacencyList;
    this.missingVertices = opts.missingVertices;
  }
}