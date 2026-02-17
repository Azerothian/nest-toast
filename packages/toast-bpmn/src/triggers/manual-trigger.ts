import 'reflect-metadata';
import { BPMN_TRIGGER_MANUAL_KEY } from '../constants';

export function ManualTrigger(processName: string): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(BPMN_TRIGGER_MANUAL_KEY, { processName, propertyKey }, target, propertyKey);
  };
}
