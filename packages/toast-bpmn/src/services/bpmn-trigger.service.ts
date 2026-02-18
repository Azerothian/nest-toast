import 'reflect-metadata';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { BPMN_TRIGGER_MANUAL_KEY, BPMN_TRIGGER_TIMER_KEY } from '../constants';
import { BpmnExecutorService } from './bpmn-executor.service';

@Injectable()
export class BpmnTriggerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BpmnTriggerService.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly executor: BpmnExecutorService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.wireManualTriggers();
    this.wireTimerTriggers();
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
      clearTimeout(timer);
    }
    this.timers.length = 0;
  }

  private wireManualTriggers(): void {
    const providers = this.discoveryService.getProviders();
    for (const wrapper of providers) {
      const instance = wrapper.instance;
      if (!instance || typeof instance !== 'object') continue;

      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) continue;

      const propertyNames = Object.getOwnPropertyNames(prototype);
      for (const prop of propertyNames) {
        const meta = Reflect.getMetadata(BPMN_TRIGGER_MANUAL_KEY, instance, prop);
        if (meta) {
          const { processName } = meta;
          (instance as Record<string, unknown>)[prop] = async (input: unknown) => {
            return this.executor.execute(processName, input);
          };
          this.logger.log(`Wired manual trigger "${prop}" -> process "${processName}"`);
        }
      }
    }
  }

  private wireTimerTriggers(): void {
    const providers = this.discoveryService.getProviders();
    for (const wrapper of providers) {
      const instance = wrapper.instance;
      if (!instance || typeof instance !== 'object') continue;

      const constructor = (instance as { constructor?: Function }).constructor;
      if (!constructor) continue;

      const meta = Reflect.getMetadata(BPMN_TRIGGER_TIMER_KEY, constructor);
      if (!meta) continue;

      const { processName, cron, interval, delay, methodName } = meta as {
        processName: string;
        cron?: string;
        interval?: number;
        delay?: number;
        methodName: string | symbol;
      };

      if (interval) {
        const timer = setInterval(async () => {
          try {
            const methodFn = (instance as Record<string | symbol, unknown>)[methodName];
            const input = typeof methodFn === 'function' ? await methodFn.call(instance) : {};
            await this.executor.execute(processName, input);
          } catch (err) {
            this.logger.error(`Timer trigger for "${processName}" failed: ${err}`);
          }
        }, interval);
        this.timers.push(timer);
        this.logger.log(`Wired timer trigger (interval=${interval}ms) -> process "${processName}"`);
      }

      if (delay) {
        const timer = setTimeout(async () => {
          try {
            const methodFn = (instance as Record<string | symbol, unknown>)[methodName];
            const input = typeof methodFn === 'function' ? await methodFn.call(instance) : {};
            await this.executor.execute(processName, input);
          } catch (err) {
            this.logger.error(`Delayed trigger for "${processName}" failed: ${err}`);
          }
        }, delay);
        this.timers.push(timer);
        this.logger.log(`Wired delay trigger (delay=${delay}ms) -> process "${processName}"`);
      }

      if (cron) {
        this.logger.warn(`Cron trigger for "${processName}" requires @nestjs/schedule - not yet implemented`);
      }
    }
  }
}
