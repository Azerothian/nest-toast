export interface ChainEvent<T> {
  name: string;
  data: T;
  workflow?: string;
  step?: string;
  timestamp: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
}
