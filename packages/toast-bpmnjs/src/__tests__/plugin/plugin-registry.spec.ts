import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../../plugin/plugin-registry';
import type { IToastBpmnPlugin } from '../../plugin/plugin-interface';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('should return null when no plugin is registered', () => {
    expect(registry.get()).toBeNull();
  });

  it('should register and retrieve a plugin', () => {
    const plugin: IToastBpmnPlugin = {
      async loadDiagram(id: string) {
        return `<xml>${id}</xml>`;
      },
    };

    registry.register(plugin);
    expect(registry.get()).toBe(plugin);
  });

  it('should replace previously registered plugin', () => {
    const plugin1: IToastBpmnPlugin = {};
    const plugin2: IToastBpmnPlugin = {
      async getChainEventNames() {
        return ['event1'];
      },
    };

    registry.register(plugin1);
    registry.register(plugin2);
    expect(registry.get()).toBe(plugin2);
  });

  it('should clear the registered plugin', () => {
    const plugin: IToastBpmnPlugin = {};
    registry.register(plugin);
    expect(registry.get()).not.toBeNull();

    registry.clear();
    expect(registry.get()).toBeNull();
  });

  it('should support plugin with all methods', () => {
    const plugin: IToastBpmnPlugin = {
      async loadDiagram() {
        return '<xml/>';
      },
      async saveDiagram() {},
      async getChainEventNames() {
        return [];
      },
      async getTypeNames() {
        return [];
      },
      async validate() {
        return [];
      },
      onDiagramChanged() {},
      onElementSelected() {},
    };

    registry.register(plugin);
    const retrieved = registry.get();
    expect(retrieved).toBe(plugin);
    expect(retrieved?.loadDiagram).toBeDefined();
    expect(retrieved?.saveDiagram).toBeDefined();
    expect(retrieved?.getChainEventNames).toBeDefined();
    expect(retrieved?.getTypeNames).toBeDefined();
    expect(retrieved?.validate).toBeDefined();
    expect(retrieved?.onDiagramChanged).toBeDefined();
    expect(retrieved?.onElementSelected).toBeDefined();
  });
});
