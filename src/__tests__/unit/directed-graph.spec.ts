import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/directed-graph';
import { DependencyCycleError } from '../../errors/dependency-cycle.error';

describe('DependencyGraph', () => {
  describe('addVertex', () => {
    it('should add a vertex', () => {
      const graph = new DependencyGraph();
      expect(() => graph.addVertex('a')).not.toThrow();
    });

    it('should be idempotent for the same vertex', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      expect(() => graph.addVertex('a')).not.toThrow();
    });
  });

  describe('addEdge', () => {
    it('should add an edge between existing vertices', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      graph.addVertex('b');
      expect(() => graph.addEdge('a', 'b')).not.toThrow();
    });

    it('should throw when adding edge from non-existent vertex', () => {
      const graph = new DependencyGraph();
      graph.addVertex('b');
      expect(() => graph.addEdge('nonexistent', 'b')).toThrow('does not exist');
    });
  });

  describe('topologicalSort', () => {
    it('should sort a linear chain', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      graph.addVertex('b');
      graph.addVertex('c');
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');
      const result = graph.topologicalSort();
      expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
      expect(result.indexOf('b')).toBeLessThan(result.indexOf('c'));
    });

    it('should sort a diamond dependency', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      graph.addVertex('b');
      graph.addVertex('c');
      graph.addVertex('d');
      graph.addEdge('a', 'b');
      graph.addEdge('a', 'c');
      graph.addEdge('b', 'd');
      graph.addEdge('c', 'd');
      const result = graph.topologicalSort();
      expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
      expect(result.indexOf('a')).toBeLessThan(result.indexOf('c'));
      expect(result.indexOf('b')).toBeLessThan(result.indexOf('d'));
      expect(result.indexOf('c')).toBeLessThan(result.indexOf('d'));
    });

    it('should handle disconnected graph', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      graph.addVertex('b');
      const result = graph.topologicalSort();
      expect(result).toHaveLength(2);
      expect(result).toContain('a');
      expect(result).toContain('b');
    });

    it('should handle single vertex', () => {
      const graph = new DependencyGraph();
      graph.addVertex('solo');
      const result = graph.topologicalSort();
      expect(result).toEqual(['solo']);
    });

    it('should handle empty graph', () => {
      const graph = new DependencyGraph();
      const result = graph.topologicalSort();
      expect(result).toEqual([]);
    });

    it('should throw DependencyCycleError on direct cycle', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      graph.addVertex('b');
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'a');
      expect(() => graph.topologicalSort()).toThrow(DependencyCycleError);
    });

    it('should throw DependencyCycleError on indirect cycle', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      graph.addVertex('b');
      graph.addVertex('c');
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');
      graph.addEdge('c', 'a');
      expect(() => graph.topologicalSort()).toThrow(DependencyCycleError);
    });

    it('should include missing vertices in DependencyCycleError', () => {
      const graph = new DependencyGraph();
      graph.addVertex('a');
      graph.addVertex('b');
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'a');
      try {
        graph.topologicalSort();
      } catch (err) {
        expect(err).toBeInstanceOf(DependencyCycleError);
        const cycleErr = err as DependencyCycleError;
        expect(cycleErr.missingVertices).toContain('a');
        expect(cycleErr.missingVertices).toContain('b');
      }
    });
  });
});
