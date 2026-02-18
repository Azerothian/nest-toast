import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChainExecutorService, PluginRegistryService } from '@azerothian/toast';
import {
  TOAST_BPMN_MODULE_OPTIONS,
  BPMN_EVENTS,
  BPMN_LIFECYCLE_START_KEY,
  BPMN_LIFECYCLE_COMPLETE_KEY,
  BPMN_LIFECYCLE_ERROR_KEY,
  BPMN_CONTEXT_METADATA_KEY,
} from '../constants';
import { BpmnExecutionError } from '../errors/bpmn-execution.error';
import { BpmnLoaderService } from './bpmn-loader.service';
import { BpmnContextService } from './bpmn-context.service';
import { BpmnValidatorService } from './bpmn-validator.service';
import type { ToastBpmnModuleOptions } from '../interfaces/bpmn-module-options.interface';
import type { BaseBpmnContext } from '../interfaces/bpmn-context.interface';
import type { BpmnProcessDefinition } from '../interfaces/bpmn-process.interface';
import type { BpmnTaskDefinition } from '../interfaces/bpmn-task.interface';
import type { ProcessStatus, AsyncExecutionResult, ProcessStatusInfo } from '../interfaces/bpmn-execution.interface';
import type { ProcessTiming, TaskTiming } from '../interfaces/bpmn-timing.interface';
import type { BpmnSequenceFlow } from '../interfaces/bpmn-flow.interface';

@Injectable()
export class BpmnExecutorService {
  private readonly logger = new Logger(BpmnExecutorService.name);
  private readonly activeProcesses = new Map<string, { status: ProcessStatus; cancel: boolean }>();
  private readonly timingData = new Map<string, ProcessTiming>();
  private readonly taskTimings = new Map<string, TaskTiming[]>();

  constructor(
    private readonly loader: BpmnLoaderService,
    private readonly contextService: BpmnContextService,
    private readonly validator: BpmnValidatorService,
    private readonly chainExecutor: ChainExecutorService,
    private readonly pluginRegistry: PluginRegistryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly discoveryService: DiscoveryService,
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

    const processStartTime = Date.now();
    this.taskTimings.set(processId, []);

    this.activeProcesses.set(processId, { status: 'running', cancel: false });

    try {
      // Fire lifecycle start
      this.eventEmitter.emit(BPMN_EVENTS.PROCESS_STARTED, {
        processId,
        processName,
        startedAt: new Date(),
      });

      await this.invokeLifecycleHooks(BPMN_LIFECYCLE_START_KEY, { processId, processName, context });

      // Walk the BPMN graph
      const result = await this.walkGraph<T, R>(definition, context, input);

      // Update context
      await this.contextService.update(processId, {
        status: 'completed',
        completedAt: new Date(),
      });

      this.activeProcesses.set(processId, { status: 'completed', cancel: false });

      const processEndTime = Date.now();
      const processDuration = processEndTime - processStartTime;
      const taskTimingsForProcess = this.taskTimings.get(processId) || [];
      const processTiming: ProcessTiming = {
        processId,
        processName,
        startedAt: context.startedAt,
        completedAt: new Date(),
        duration: processDuration,
        totalDuration: processDuration,
        executionTime: processDuration,
        tasks: taskTimingsForProcess,
      };
      this.timingData.set(processId, processTiming);

      // Fire lifecycle complete
      this.eventEmitter.emit(BPMN_EVENTS.PROCESS_COMPLETED, {
        processId,
        processName,
        completedAt: new Date(),
        duration: Date.now() - context.startedAt.getTime(),
        output: result,
      });

      await this.invokeLifecycleHooks(BPMN_LIFECYCLE_COMPLETE_KEY, { processId, processName, output: result, context });

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

      await this.invokeLifecycleHooks(BPMN_LIFECYCLE_ERROR_KEY, { processId, processName, error, context });

      throw error;
    } finally {
      // Clean up after 5 minutes to prevent memory leak
      setTimeout(() => {
        this.activeProcesses.delete(processId);
        this.taskTimings.delete(processId);
      }, 300_000);
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
      startedAt: new Date(),
    };
  }

  async getStatus(processId: string): Promise<ProcessStatusInfo | undefined> {
    const active = this.activeProcesses.get(processId);
    if (active) {
      const ctx = await this.contextService.get(processId);
      return { status: active.status, currentStep: ctx?.currentStep };
    }
    const ctx = await this.contextService.get(processId);
    if (!ctx) return undefined;
    return { status: ctx.status as ProcessStatus, currentStep: ctx.currentStep };
  }

  getTiming(processId: string): ProcessTiming | undefined {
    return this.timingData.get(processId);
  }

  async retry(processId: string, taskId: string): Promise<unknown> {
    const ctx = await this.contextService.get(processId);
    if (!ctx) {
      throw new BpmnExecutionError({ message: `Process "${processId}" not found`, processId, processName: '' });
    }
    const definition = this.loader.getDefinition(ctx.processName);
    if (!definition) {
      throw new BpmnExecutionError({ message: `Process definition "${ctx.processName}" not found`, processId, processName: ctx.processName });
    }
    const task = definition.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new BpmnExecutionError({ message: `Task "${taskId}" not found in process`, processId, processName: ctx.processName, taskId });
    }
    const failedStep = ctx.stepHistory.find(s => s.taskId === taskId && s.status === 'failed');
    const lastInput = failedStep ? ctx.data : ctx.data;
    return this.executeTask(task, lastInput, ctx, definition);
  }

  async cancel(processId: string): Promise<boolean> {
    const active = this.activeProcesses.get(processId);
    if (!active || active.status !== 'running') return false;
    active.cancel = true;
    active.status = 'cancelled';
    await this.contextService.update(processId, { status: 'cancelled' });
    return true;
  }

  private async invokeLifecycleHooks(metadataKey: string, payload: Record<string, unknown>): Promise<void> {
    const providers = this.discoveryService.getProviders();
    for (const wrapper of providers) {
      const instance = wrapper.instance;
      if (!instance || typeof instance !== 'object') continue;
      const constructor = (instance as any).constructor;
      if (!constructor) continue;
      const methodName = Reflect.getMetadata(metadataKey, constructor);
      if (methodName && typeof (instance as any)[methodName] === 'function') {
        try {
          await (instance as any)[methodName](payload);
        } catch (err) {
          this.logger.error(`Lifecycle hook ${String(methodName)} failed: ${err}`);
        }
      }
    }
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
    const gatewayMap = new Map(definition.gateways.map(g => [g.id, g]));

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

      // If current element is a task, execute it first
      const currentTask = taskMap.get(currentElementId);
      if (currentTask && !visited.has(currentElementId)) {
        visited.add(currentElementId);
        currentValue = await this.executeTask(currentTask, currentValue, context, definition);
      }

      // If current element is a gateway, handle routing
      const gateway = gatewayMap.get(currentElementId);
      if (gateway) {
        if (gateway.type === 'exclusive') {
          // Evaluate conditions on outgoing flows
          const gatewayFlows = flowsBySource.get(currentElementId) ?? [];
          let selectedFlow: BpmnSequenceFlow | undefined;
          for (const flow of gatewayFlows) {
            if (flow.conditionExpression) {
              try {
                const evalFn = new Function('context', 'data', `return ${flow.conditionExpression}`);
                if (evalFn(context, currentValue)) {
                  selectedFlow = flow;
                  break;
                }
              } catch {
                // Skip flows with invalid expressions
              }
            }
          }
          if (!selectedFlow) {
            // Use default flow
            const defaultFlow = gatewayFlows.find(f => f.id === gateway.default) ?? gatewayFlows[gatewayFlows.length - 1];
            selectedFlow = defaultFlow;
          }
          if (selectedFlow) {
            currentElementId = selectedFlow.targetRef;
            continue;
          }
        } else if (gateway.type === 'parallel') {
          // Execute all branches concurrently
          const gatewayFlows = flowsBySource.get(currentElementId) ?? [];
          const branchResults = await Promise.all(
            gatewayFlows.map(async (flow) => {
              // Walk each branch independently
              let branchElement = flow.targetRef;
              let branchValue = currentValue;
              const branchVisited = new Set<string>();
              let branchSteps = maxSteps;
              while (branchSteps-- > 0) {
                if (endEventIds.has(branchElement)) break;
                const branchTask = taskMap.get(branchElement);
                if (branchTask) {
                  if (branchVisited.has(branchElement)) break;
                  branchVisited.add(branchElement);
                  branchValue = await this.executeTask(branchTask, branchValue, context, definition);
                }
                // Check if next element is a joining gateway
                const nextGateway = gatewayMap.get(branchElement);
                if (nextGateway && nextGateway !== gateway) break;
                const nextFlows = flowsBySource.get(branchElement) ?? [];
                if (nextFlows.length === 0) break;
                branchElement = nextFlows[0].targetRef;
              }
              return { targetId: branchElement, value: branchValue };
            })
          );
          // After parallel branches, continue from the joining point
          if (branchResults.length > 0) {
            currentElementId = branchResults[0].targetId;
            currentValue = branchResults[branchResults.length - 1].value;
            continue;
          }
        }
        // For inclusive or unknown gateway types, just follow first flow
        const fallbackFlows = flowsBySource.get(currentElementId) ?? [];
        if (fallbackFlows.length > 0) {
          currentElementId = fallbackFlows[0].targetRef;
          continue;
        }
        break;
      }

      // Get outgoing flows and advance to next element
      const outgoingFlows = flowsBySource.get(currentElementId) ?? [];
      if (outgoingFlows.length === 0) {
        break;
      }

      currentElementId = outgoingFlows[0].targetRef;
    }

    return currentValue as R;
  }

  private async executeTask(
    task: BpmnTaskDefinition,
    input: unknown,
    context: BaseBpmnContext,
    definition?: BpmnProcessDefinition,
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

      const retryPolicy = task.retryPolicy ?? definition?.retryPolicy;
      const maxRetries = retryPolicy?.maxRetries ?? 0;
      const backoffMs = retryPolicy?.backoffMs ?? 1000;
      const backoffMultiplier = retryPolicy?.backoffMultiplier ?? 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (task.chainEventName) {
            // Get handlers from plugin registry
            const handlerEntries = this.pluginRegistry.getHandlersForEvent(task.chainEventName);

            if (handlerEntries.length > 0) {
              // Build handler functions for waterfall
              const handlers = handlerEntries.map(entry => {
                return async (value: unknown) => {
                  const instance = entry.instance as Record<string, Function>;
                  const contextParamIndex = Reflect.getMetadata(BPMN_CONTEXT_METADATA_KEY, entry.instance as Object, entry.method);
                  if (contextParamIndex !== undefined) {
                    const args: unknown[] = [value];
                    // Insert context at the specified parameter index
                    while (args.length < contextParamIndex) args.push(undefined);
                    args[contextParamIndex] = context;
                    if (args[0] === undefined) args[0] = value;
                    return instance[entry.method](...args);
                  }
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
          // On success, break out of retry loop
          break;
        } catch (retryErr) {
          if (attempt < maxRetries) {
            const delay = backoffMs * Math.pow(backoffMultiplier, attempt);
            this.logger.warn(`Task "${task.name}" failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw retryErr;
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

      const taskTiming: TaskTiming = {
        taskId: task.id,
        taskName: task.name,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
      };
      const timings = this.taskTimings.get(processId);
      if (timings) timings.push(taskTiming);

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
