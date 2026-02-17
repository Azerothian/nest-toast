import 'reflect-metadata';
import { PLUGIN_METADATA_KEY } from '../constants';
import type { PluginMetadata } from '../interfaces/plugin-metadata.interface';

export function Plugin(metadata: PluginMetadata): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(PLUGIN_METADATA_KEY, metadata, target);
  };
}
