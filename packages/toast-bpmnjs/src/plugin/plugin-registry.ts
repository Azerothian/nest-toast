import type { IToastBpmnPlugin } from './plugin-interface';

export class PluginRegistry {
  private plugin: IToastBpmnPlugin | null = null;

  register(plugin: IToastBpmnPlugin): void {
    this.plugin = plugin;
  }

  get(): IToastBpmnPlugin | null {
    return this.plugin;
  }

  clear(): void {
    this.plugin = null;
  }
}

export const defaultRegistry = new PluginRegistry();
