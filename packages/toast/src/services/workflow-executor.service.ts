import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChainExecutorService } from './chain-executor.service';
import { ChainContextService } from './chain-context.service';
import { PluginRegistryService } from './plugin-registry.service';
import type { WorkflowStep } from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowExecutorService {
  constructor(
    private readonly chainExecutor: ChainExecutorService,
    private readonly pluginRegistry: PluginRegistryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly chainContext: ChainContextService,
  ) {}

  async executeWorkflow<T>(
    name: string,
    initialData: T,
    steps: WorkflowStep<unknown, unknown>[],
  ): Promise<T> {
    return this.chainContext.run(async () => {
      this.eventEmitter.emit(`workflow:${name}:started`, initialData);

      let currentData: unknown = initialData;

      for (const step of steps) {
        // Check cancellation before each step
        if (this.chainContext.isCancelled() || this.chainContext.isFinished()) {
          break;
        }

        this.eventEmitter.emit(`workflow:${name}:step:${step.name}:started`, currentData);

        currentData = await step.handler(currentData);

        // Check after step handler
        if (this.chainContext.isCancelled() || this.chainContext.isFinished()) {
          this.eventEmitter.emit(`workflow:${name}:cancelled`, currentData);
          break;
        }

        if (step.emitEvent) {
          const eventName =
            typeof step.emitEvent === 'function'
              ? step.emitEvent(currentData)
              : step.emitEvent;

          // Dispatch to @OnChainEvent handlers via waterfall
          const handlers = this.pluginRegistry.getHandlersForEvent(eventName);
          if (handlers.length > 0) {
            const chainHandlers = handlers.map(
              h => async (data: unknown) => (h.instance as Record<string, Function>)[h.method](data),
            );
            currentData = await this.chainExecutor.waterfall(currentData as never, chainHandlers as never);
            // Propagate inner cancellation to outer workflow context
            if (this.chainContext.isCancelled() || this.chainContext.isFinished()) {
              this.eventEmitter.emit(`workflow:${name}:cancelled`, currentData);
              break;
            }
          }

          this.eventEmitter.emit(eventName, currentData);
        }

        this.eventEmitter.emit(`workflow:${name}:step:${step.name}:completed`, currentData);
      }

      if (!this.chainContext.isCancelled() && !this.chainContext.isFinished()) {
        this.eventEmitter.emit(`workflow:${name}:completed`, currentData);
      }
      return currentData as T;
    });
  }
}
