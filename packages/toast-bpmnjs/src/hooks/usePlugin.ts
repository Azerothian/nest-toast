import { usePluginContext } from '../context/PluginContext';
import type { IToastBpmnPlugin } from '../plugin/plugin-interface';

export function usePlugin(): IToastBpmnPlugin | null {
  return usePluginContext();
}
