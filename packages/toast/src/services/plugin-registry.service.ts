import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { DependencyGraph } from '../graph/directed-graph';
import { PLUGIN_METADATA_KEY, CHAIN_EVENT_HANDLERS_KEY, TOAST_MODULE_OPTIONS } from '../constants';
import type { PluginInfo, PluginMetadata } from '../interfaces/plugin-metadata.interface';
import type { ToastModuleOptions } from '../interfaces/toast-module-options.interface';
import type { ChainEventHandlerRecord } from '../decorators/on-chain-event.decorator';

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private _plugins: PluginInfo[] = [];
  private _initializationOrder: string[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    @Inject(TOAST_MODULE_OPTIONS) private readonly options: ToastModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    this._discoverPlugins();
    this._validateCompatibility();
    this._validateDependencies();
    this._initializationOrder = this._computeInitOrder();
  }

  private _discoverPlugins(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const instance = wrapper.instance;
      if (!instance || typeof instance !== 'object') continue;

      const constructor = Object.getPrototypeOf(instance)?.constructor;
      if (!constructor) continue;

      const metadata: PluginMetadata | undefined = Reflect.getMetadata(
        PLUGIN_METADATA_KEY,
        constructor,
      );

      if (!metadata) continue;

      if (this.options.discoveryFilter && !this.options.discoveryFilter(metadata)) {
        continue;
      }

      this._plugins.push({ name: metadata.name, instance, metadata });
    }
  }

  private _validateCompatibility(): void {
    if (!this.options.validateCompatibility) return;

    const pluginNames = new Set(this._plugins.map(p => p.name));

    for (const plugin of this._plugins) {
      if (!plugin.metadata.incompatibleWith) continue;
      for (const incompatible of plugin.metadata.incompatibleWith) {
        if (pluginNames.has(incompatible)) {
          throw new Error(
            `Plugin "${plugin.name}" is incompatible with plugin "${incompatible}"`,
          );
        }
      }
    }
  }

  private _validateDependencies(): void {
    const pluginNames = new Set(this._plugins.map(p => p.name));

    for (const plugin of this._plugins) {
      if (!plugin.metadata.dependencies) continue;
      for (const dep of plugin.metadata.dependencies) {
        if (!pluginNames.has(dep)) {
          throw new Error(
            `Plugin "${plugin.name}" requires dependency "${dep}" which is not registered`,
          );
        }
      }
    }
  }

  private _computeInitOrder(): string[] {
    const graph = new DependencyGraph();

    for (const plugin of this._plugins) {
      graph.addVertex(plugin.name);
    }

    for (const plugin of this._plugins) {
      if (!plugin.metadata.dependencies) continue;
      for (const dep of plugin.metadata.dependencies) {
        // Edge: dep -> plugin (dep initializes before plugin)
        graph.addEdge(dep, plugin.name);
      }
    }

    return graph.topologicalSort();
  }

  getPlugin<T>(name: string): T {
    const plugin = this._plugins.find(p => p.name === name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }
    return plugin.instance as T;
  }

  hasPlugin(name: string): boolean {
    return this._plugins.some(p => p.name === name);
  }

  getAllPlugins(): PluginInfo[] {
    return [...this._plugins];
  }

  getPluginMetadata(name: string): PluginMetadata | undefined {
    return this._plugins.find(p => p.name === name)?.metadata;
  }

  getInitializationOrder(): string[] {
    return [...this._initializationOrder];
  }

  getHandlersForEvent(eventName: string): Array<{ instance: unknown; method: string }> {
    const result: Array<{ instance: unknown; method: string }> = [];

    // Sort plugins by initialization order
    const orderedPlugins = [...this._plugins].sort((a, b) => {
      const aIdx = this._initializationOrder.indexOf(a.name);
      const bIdx = this._initializationOrder.indexOf(b.name);
      const aOrder = aIdx === -1 ? Infinity : aIdx;
      const bOrder = bIdx === -1 ? Infinity : bIdx;
      return aOrder - bOrder;
    });

    for (const plugin of orderedPlugins) {
      const constructor = Object.getPrototypeOf(plugin.instance as object)?.constructor;
      if (!constructor) continue;

      const handlers: ChainEventHandlerRecord[] =
        Reflect.getMetadata(CHAIN_EVENT_HANDLERS_KEY, constructor) ?? [];

      for (const handler of handlers) {
        if (this._matchesPattern(handler.eventName, eventName)) {
          result.push({ instance: plugin.instance, method: handler.methodName });
        }
      }
    }

    return result;
  }

  private _matchesPattern(pattern: string, eventName: string): boolean {
    if (pattern === eventName) return true;
    if (pattern === '**') return true;

    // Convert glob to regex: ** matches any chars, * matches non-colon chars
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped
      .replace(/\*\*/g, '.*')
      .replace(/(?<!\.)\*/g, '[^:]*');

    try {
      const regex = new RegExp(`^${regexStr}$`);
      return regex.test(eventName);
    } catch {
      return false;
    }
  }
}
