import 'reflect-metadata';
import { BPMN_TRIGGER_TIMER_KEY } from '../constants';
import type { TimerTriggerOptions } from '../interfaces/bpmn-trigger.interface';

export function TimerTrigger(options: TimerTriggerOptions): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(BPMN_TRIGGER_TIMER_KEY, { ...options, methodName: propertyKey }, target.constructor);
    return descriptor;
  };
}
