export interface PluginMetadata {
  name: string;
  version: string;
  dependencies?: string[];
  optionalDependencies?: string[];
  incompatibleWith?: string[];
  tags?: string[];
}

export interface PluginInfo {
  name: string;
  instance: unknown;
  metadata: PluginMetadata;
}
