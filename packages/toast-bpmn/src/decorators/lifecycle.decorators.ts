import 'reflect-metadata';
import {
  BPMN_LIFECYCLE_START_KEY,
  BPMN_LIFECYCLE_COMPLETE_KEY,
  BPMN_LIFECYCLE_ERROR_KEY,
} from '../constants';

function createLifecycleDecorator(metadataKey: string): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(metadataKey, propertyKey, (target as { constructor: Function }).constructor);
    return descriptor;
  };
}

export function OnProcessStart(): MethodDecorator {
  return createLifecycleDecorator(BPMN_LIFECYCLE_START_KEY);
}

export function OnProcessComplete(): MethodDecorator {
  return createLifecycleDecorator(BPMN_LIFECYCLE_COMPLETE_KEY);
}

export function OnProcessError(): MethodDecorator {
  return createLifecycleDecorator(BPMN_LIFECYCLE_ERROR_KEY);
}
