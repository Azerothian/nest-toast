export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export interface QueueConfig {
  name?: string;
  concurrency?: number;
  maxRetries?: number;
  backoffType?: 'exponential' | 'fixed';
  backoffDelay?: number;
}

export interface DistributedConfig {
  enabled: boolean;
  redis: RedisConfig;
  queue?: QueueConfig;
}

export interface ContextConfig {
  maxHistorySize?: number;
  ttlMs?: number;
  persistence?: 'memory' | 'redis';
}

export interface TimingConfig {
  enabled?: boolean;
  slowTaskThresholdMs?: number;
}

export interface DebuggingConfig {
  enabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  traceExecution?: boolean;
}

export interface TypeDiscoveryConfig {
  enabled?: boolean;
  strictMode?: boolean;
}

export interface ToastBpmnModuleOptions {
  bpmnPath?: string;
  distributed?: DistributedConfig;
  context?: ContextConfig;
  timing?: TimingConfig;
  debugging?: DebuggingConfig;
  typeDiscovery?: TypeDiscoveryConfig;
}
