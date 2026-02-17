import 'reflect-metadata';
import { BPMN_TASK_METADATA_KEY, BPMN_TASK_HANDLERS_KEY } from '../constants';
import type { BpmnTaskOptions, BpmnTaskType } from '../interfaces/bpmn-task.interface';

export interface BpmnTaskHandlerRecord {
  taskId: string;
  methodName: string;
  type: BpmnTaskType;
}

export function BpmnTask(options: BpmnTaskOptions): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    // Per-method metadata
    Reflect.defineMetadata(BPMN_TASK_METADATA_KEY, options, target, propertyKey);

    // Per-class array (dual metadata pattern)
    const constructor = (target as { constructor: Function }).constructor;
    const existingHandlers: BpmnTaskHandlerRecord[] =
      Reflect.getMetadata(BPMN_TASK_HANDLERS_KEY, constructor) ?? [];
    existingHandlers.push({
      taskId: options.taskId,
      methodName: propertyKey as string,
      type: options.type ?? 'serviceTask',
    });
    Reflect.defineMetadata(BPMN_TASK_HANDLERS_KEY, existingHandlers, constructor);

    return descriptor;
  };
}
