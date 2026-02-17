import 'reflect-metadata';
import { BPMN_TYPE_METADATA_KEY } from '../constants';
import type { RegisterTypeOptions } from '../interfaces/bpmn-trigger.interface';

export interface RegisterTypeMetadata {
  name: string;
  schema?: Record<string, unknown>;
}

export function RegisterType(options?: RegisterTypeOptions): ClassDecorator {
  return (target: Function) => {
    const metadata: RegisterTypeMetadata = {
      name: options?.name ?? target.name,
      schema: options?.schema,
    };
    Reflect.defineMetadata(BPMN_TYPE_METADATA_KEY, metadata, target);
  };
}
