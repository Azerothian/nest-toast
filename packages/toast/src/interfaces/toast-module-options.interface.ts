import type { ExecutionTrackingConfig } from './execution-tracking.interface';
import type { PluginMetadata } from './plugin-metadata.interface';

export interface ToastModuleOptions {
  validateCompatibility?: boolean;
  enableDiscovery?: boolean;
  executionTracking?: ExecutionTrackingConfig;
  discoveryFilter?: (metadata: PluginMetadata) => boolean;
}
