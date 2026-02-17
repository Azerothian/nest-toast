import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChainExecutorService, PluginRegistryService } from '@azerothian/toast';
import { TOAST_BPMN_MODULE_OPTIONS, BPMN_EVENTS } from '../constants';
import { BpmnExecutionError } from '../errors/bpmn-execution.error';
import { BpmnLoaderService } from './bpmn-loader.service';
import { BpmnContextService } from './bpmn-context.service';
import { BpmnValidatorService } from './bpmn-validator.service';
import type { ToastBpmnModuleOptions } from '../interfaces/bpmn-module-options.interface';
import type { BaseBpmnContext } from '../interfaces/bpmn-context.interface';
import type { BpmnProcessDefinition } from '../interfaces/bpmn-process.interface';
import type { BpmnTaskDefinition } from '../interfaces/bpmn-task.interface';
import type { ProcessStatus, AsyncExecutionResult } from '../interfaces/bpmn-execution.interface';
import type { BpmnSequenceFlow } from '../interfaces/bpmn-flow.interface';

@Injectable()
export class BpmnExecutorService {
  private readonly logger = new Logger(BpmnExecutorService.name);
  private readonly activeProcesses = new Map<string, { status: ProcessStatus; cancel: boolean }>();

  constructor(
    private readonly loader: BpmnLoaderService,
    private readonly contextService: BpmnContextService,
    private readonly validator: BpmnValidatorService,
    private readonly chainExecutor: ChainExecutorService,
    private readonly pluginRegistry: PluginRegistryService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(TOAST_BPMN_MODULE_OPTIONS) @Optional() private readonly options?: ToastBpmnModuleOptions,
  ) {}

  async execute<T = unknown, R = unknown>(processName: string, input: T): Promise<R> {
    const definition = this.loader.getDefinition(processName);
    if (!definition) {
      throw new BpmnExecutionError({
        message: `Process "${processName}" not found`,
        processId: '',
        processName,
      });
    }

    // Validate
    this.validator.validateOrThrow(definition);

    // Create context
    const context = await this.contextService.create(processName, { input, output: undefined as unknown });
    const processId = context.processId;

    this.activeProcesses.set(processId, { status: 'running', cancel: false });

    try {
      // Fire lifecycle start
      this.eventEmitter.emit(BPMN_EVENTS.PROCESS_STARTED, {
        processId,
        processName,
        startedAt: new Date(),
      });

      // Walk the BPMN graph
      const result = await this.walkGraph<T, R>(definition, context, input);

      // Update context
      await this.contextService.update(processId, {
        status: 'completed',
        completedAt: new Date(),
      });

      this.activeProcesses.set(processId, { status: 'completed', cancel: false });

      // Fire lifecycle complete
      this.eventEmitter.emit(BPMN_EVENTS.PROCESS_COMPLETED, {
        processId,
        processName,
        completedAt: new Date(),
        duration: Date.now() - context.startedAt.getTime(),
        output: result,
      });

      return result;
    } catch (err) {
      await this.contextService.update(processId, {
        status: 'failed',
        completedAt: new Date(),
      });

      this.activeProcesses.set(processId, { status: 'failed', cancel: false });

      const error = err instanceof BpmnExecutionError ? err : new BpmnExecutionError({
        message: err instanceof Error ? err.message : String(err),
        processId,
        processName,
        originalError: err instanceof Error ? err : undefined,
      });

      this.eventEmitter.emit(BPMN_EVENTS.PROCESS_FAILED, {
        processId,
        processName,
        failedAt: new Date(),
        error,
      });

      throw error;
    }
  }

  async executeAsync<T = unknown>(processName: string, input: T): Promise<AsyncExecutionResult> {
    const definition = this.loader.getDefinition(processName);
    if (!definition) {
      throw new BpmnExecutionError({
        message: `Process "${processName}" not found`,
        processId: '',
        processName,
      });
    }

    const context = await this.contextService.create(processName, { input });
    const processId = context.processId;

    this.activeProcesses.set(processId, { status: 'pending', cancel: false });

    // Fire and forget - execute in background
    setImmediate(() => {
      this.execute(processName, input).catch(err => {
        this.logger.error(`Async process ${processName} (${processId}) failed: ${err.message}`);
      });
    });

    return {
      processId,
      processName,
      status: 'pending',
    };
  }

  async getStatus(processId: string): Promise<ProcessStatus | undefined> {
    const active = this.activeProcesses.get(processId);
    if (active) return active.status;
    const ctx = await this.contextService.get(processId);
    return ctx?.status as ProcessStatus | undefined;
  }

  async cancel(processId: string): Promise<boolean> {
    const active = this.activeProcesses.get(processId);
    if (!active || active.status !== 'running') return false;
    active.cancel = true;
    active.status = 'cancelled';
    await this.contextService.update(processId, { status: 'cancelled' });
    return true;
  }

  private async walkGraph<T, R>(
    definition: BpmnProcessDefinition,
    context: BaseBpmnContext,
    input: T,
  ): Promise<R> {
    // Find start event
    if (definition.startEvents.length === 0) {
      throw new BpmnExecutionError({
        message: 'No start event found in process',
        processId: context.processId,
        processName: definition.name,
      });
    }

    const startEvent = definition.startEvents[0];
    let currentElementId = startEvent.id;
    let currentValue: unknown = input;

    // Build lookup maps
    const taskMap = new Map(definition.tasks.map(t => [t.id, t]));
    const flowsBySource = new Map<string, BpmnSequenceFlow[]>();
    for (const flow of definition.flows) {
      const existing = flowsBySource.get(flow.sourceRef) ?? [];
      existing.push(flow);
      flowsBySource.set(flow.sourceRef, existing);
    }
    const endEventIds = new Set(definition.endEvents.map(e => e.id));

    // Walk: follow outgoing flows from current element
    const visited = new Set<string>();
    let maxSteps = definition.tasks.length + definition.startEvents.length + definition.endEvents.length + definition.flows.length + 10;

    while (maxSteps-- > 0) {
      // Check cancellation
      const processState = this.activeProcesses.get(context.processId);
      if (processState?.cancel) {
        throw new BpmnExecutionError({
          message: 'Process was cancelled',
          processId: context.processId,
          processName: definition.name,
        });
      }

      // If we've reached an end event, return
      if (endEventIds.has(currentElementId)) {
        break;
      }

      // Get outgoing flows
      const outgoingFlows = flowsBySource.get(currentElementId) ?? [];
      if (outgoingFlows.length === 0) {
        // Dead end - no outgoing flows and not an end event
        break;
      }

      // Follow the first valid flow (simple sequential for now)
      const nextFlow = outgoingFlows[0];
      const targetId = nextFlow.targetRef;

      // If target is an end event, we're done
      if (endEventIds.has(targetId)) {
        currentElementId = targetId;
        continue;
      }

      // If target is a task, execute it
      const task = taskMap.get(targetId);
      if (task) {
        if (visited.has(targetId)) {
          throw new BpmnExecutionError({
            message: `Cycle detected at task "${targetId}"`,
            processId: context.processId,
            processName: definition.name,
            taskId: targetId,
          });
        }
        visited.add(targetId);

        currentValue = await this.executeTask(task, currentValue, context);
        currentElementId = targetId;
      } else {
        // Skip unknown elements
        currentElementId = targetId;
      }
    }

    return currentValue as R;
  }

  private async executeTask(
    task: BpmnTaskDefinition,
    input: unknown,
    context: BaseBpmnContext,
  ): Promise<unknown> {
    const processId = context.processId;

    // Update context
    await this.contextService.update(processId, { currentStep: task.id });
    await this.contextService.addStepHistory(processId, {
      taskId: task.id,
      taskName: task.name,
      startedAt: new Date(),
      status: 'running',
    });

    this.eventEmitter.emit(BPMN_EVENTS.TASK_STARTED, {
      processId,
      taskId: task.id,
      taskName: task.name,
      startedAt: new Date(),
    });

    const startTime = Date.now();

    try {
      let result: unknown = input;

      if (task.chainEventName) {
        // Get handlers from plugin registry
        const handlerEntries = this.pluginRegistry.getHandlersForEvent(task.chainEventName);

        if (handlerEntries.length > 0) {
          // Build handler functions for waterfall
          const handlers = handlerEntries.map(entry => {
            return async (value: unknown) => {
              const instance = entry.instance as Record<string, Function>;
              return instance[entry.method](value, context);
            };
          });

          // Execute via waterfall
          result = await this.chainExecutor.waterfall(
            input,
            handlers,
            task.timeout ? { timeout: task.timeout } : undefined,
          );
        }
      }

      const duration = Date.now() - startTime;

      // Update step history with completion
      const ctx = await this.contextService.get(processId);
      if (ctx) {
        const lastStep = ctx.stepHistory[ctx.stepHistory.length - 1];
        if (lastStep && lastStep.taskId === task.id) {
          lastStep.completedAt = new Date();
          lastStep.status = 'completed';
          lastStep.output = result;
          await this.contextService.update(processId, { stepHistory: ctx.stepHistory });
        }
      }

      this.eventEmitter.emit(BPMN_EVENTS.TASK_COMPLETED, {
        processId,
        taskId: task.id,
        taskName: task.name,
        completedAt: new Date(),
        duration,
        output: result,
      });

      return result;
    } catch (err) {
      // Update step history with failure
      const ctx = await this.contextService.get(processId);
      if (ctx) {
        const lastStep = ctx.stepHistory[ctx.stepHistory.length - 1];
        if (lastStep && lastStep.taskId === task.id) {
          lastStep.completedAt = new Date();
          lastStep.status = 'failed';
          lastStep.error = err instanceof Error ? err : new Error(String(err));
          await this.contextService.update(processId, { stepHistory: ctx.stepHistory });
        }
      }

      this.eventEmitter.emit(BPMN_EVENTS.TASK_FAILED, {
        processId,
        taskId: task.id,
        taskName: task.name,
        failedAt: new Date(),
        error: err instanceof Error ? err : new Error(String(err)),
      });

      throw new BpmnExecutionError({
        message: `Task "${task.name}" (${task.id}) failed: ${err instanceof Error ? err.message : String(err)}`,
        processId,
        processName: context.processName,
        taskId: task.id,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
}
