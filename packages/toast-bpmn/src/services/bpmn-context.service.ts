import { Injectable, Inject, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TOAST_BPMN_MODULE_OPTIONS } from '../constants';
import type { BaseBpmnContext, StepHistoryEntry } from '../interfaces/bpmn-context.interface';
import type { ToastBpmnModuleOptions } from '../interfaces/bpmn-module-options.interface';

@Injectable()
export class BpmnContextService {
  private readonly contexts = new Map<string, BaseBpmnContext>();
  private redisClient?: any; // dynamic import of ioredis

  constructor(
    @Inject(TOAST_BPMN_MODULE_OPTIONS) @Optional() private readonly options?: ToastBpmnModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.options?.context?.persistence === 'redis' && this.options?.distributed?.redis) {
      try {
        const { default: Redis } = await import('ioredis');
        this.redisClient = new Redis(this.options.distributed.redis);
      } catch {
        // ioredis not available, fall back to memory
      }
    }
  }

  async create<T = Record<string, unknown>>(processName: string, initialData: T): Promise<BaseBpmnContext<T>> {
    const context: BaseBpmnContext<T> = {
      processId: randomUUID(),
      processName,
      currentStep: '',
      stepHistory: [],
      data: initialData,
      startedAt: new Date(),
      status: 'running',
      metadata: {},
    };

    if (this.redisClient) {
      const key = this.getRedisKey(context.processId);
      await this.redisClient.set(key, JSON.stringify(context), 'PX', this.options?.context?.ttlMs ?? 3600000);
    } else {
      this.contexts.set(context.processId, context as BaseBpmnContext);
    }

    return context;
  }

  async update<T = Record<string, unknown>>(processId: string, updates: Partial<BaseBpmnContext<T>>): Promise<BaseBpmnContext<T> | undefined> {
    const context = await this.get<T>(processId);
    if (!context) return undefined;

    Object.assign(context, updates);

    if (this.redisClient) {
      const key = this.getRedisKey(processId);
      await this.redisClient.set(key, JSON.stringify(context), 'PX', this.options?.context?.ttlMs ?? 3600000);
    } else {
      this.contexts.set(processId, context as BaseBpmnContext);
    }

    return context;
  }

  async get<T = Record<string, unknown>>(processId: string): Promise<BaseBpmnContext<T> | undefined> {
    if (this.redisClient) {
      const key = this.getRedisKey(processId);
      const data = await this.redisClient.get(key);
      if (!data) return undefined;
      return JSON.parse(data) as BaseBpmnContext<T>;
    }
    return this.contexts.get(processId) as BaseBpmnContext<T> | undefined;
  }

  async addStepHistory(processId: string, entry: StepHistoryEntry): Promise<void> {
    const context = await this.get(processId);
    if (!context) return;
    context.stepHistory.push(entry);
    // Trim if configured
    const maxHistory = this.options?.context?.maxHistorySize;
    if (maxHistory && context.stepHistory.length > maxHistory) {
      context.stepHistory = context.stepHistory.slice(-maxHistory);
    }
    await this.update(processId, { stepHistory: context.stepHistory });
  }

  async serialize(processId: string): Promise<string | undefined> {
    const context = await this.get(processId);
    if (!context) return undefined;
    return JSON.stringify(context);
  }

  async deserialize<T = Record<string, unknown>>(serialized: string): Promise<BaseBpmnContext<T>> {
    const context = JSON.parse(serialized) as BaseBpmnContext<T>;
    if (this.redisClient) {
      const key = this.getRedisKey(context.processId);
      await this.redisClient.set(key, serialized, 'PX', this.options?.context?.ttlMs ?? 3600000);
    } else {
      this.contexts.set(context.processId, context as BaseBpmnContext);
    }
    return context;
  }

  async delete(processId: string): Promise<boolean> {
    if (this.redisClient) {
      const key = this.getRedisKey(processId);
      const result = await this.redisClient.del(key);
      return result > 0;
    }
    return this.contexts.delete(processId);
  }

  private getRedisKey(processId: string): string {
    const prefix = this.options?.distributed?.redis?.keyPrefix ?? 'toast-bpmn:ctx:';
    return `${prefix}${processId}`;
  }
}
