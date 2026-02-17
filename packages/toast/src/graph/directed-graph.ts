import { DependencyCycleError } from '../errors/dependency-cycle.error';

export class DependencyGraph {
  private adjacencyList: Map<string, string[]>;

  constructor() {
    this.adjacencyList = new Map<string, string[]>();
  }

  addVertex(vertex: string): void {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }

  addEdge(from: string, to: string): void {
    if (this.adjacencyList.has(from)) {
      this.adjacencyList.get(from)!.push(to);
    } else {
      throw new Error(`Vertex ${from} does not exist in the graph.`);
    }
  }

  topologicalSort(): string[] {
    const indegree: Map<string, number> = new Map();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate indegree for each vertex
    for (const [vertex, neighbors] of this.adjacencyList) {
      indegree.set(vertex, indegree.get(vertex) ?? 0);
      for (const neighbor of neighbors) {
        indegree.set(neighbor, (indegree.get(neighbor) ?? 0) + 1);
      }
    }

    // Initialize the queue with vertices having indegree of 0
    for (const [vertex, degree] of indegree) {
      if (degree === 0) {
        queue.push(vertex);
      }
    }

    // Topological sort using Kahn's algorithm
    while (queue.length > 0) {
      const vertex = queue.shift()!;
      result.push(vertex);

      const neighbors = this.adjacencyList.get(vertex) ?? [];
      for (const neighbor of neighbors) {
        const newDegree = indegree.get(neighbor)! - 1;
        indegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== this.adjacencyList.size) {
      const missingVertices = Array.from(this.adjacencyList.keys()).filter(
        v => !result.includes(v),
      );
      throw new DependencyCycleError({
        message: 'Circular dependency detected. Topological sorting is not possible.',
        result,
        adjacencyList: this.adjacencyList,
        missingVertices,
      });
    }

    return result;
  }
}
