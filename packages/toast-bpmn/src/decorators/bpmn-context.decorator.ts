import 'reflect-metadata';
import { BPMN_CONTEXT_METADATA_KEY } from '../constants';

export function BpmnContext(): ParameterDecorator {
  return (
    target: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(BPMN_CONTEXT_METADATA_KEY, parameterIndex, target, propertyKey);
    }
  };
}
