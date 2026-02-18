import { createContext, useContext, type ReactNode } from 'react';
import type { IToastBpmnPlugin } from '../plugin/plugin-interface';

const PluginContext = createContext<IToastBpmnPlugin | null>(null);

export interface PluginProviderProps {
  plugin: IToastBpmnPlugin;
  children: ReactNode;
}

export function PluginProvider({ plugin, children }: PluginProviderProps) {
  return (
    <PluginContext.Provider value={plugin}>{children}</PluginContext.Provider>
  );
}

export function usePluginContext(): IToastBpmnPlugin | null {
  return useContext(PluginContext);
}

export { PluginContext };
