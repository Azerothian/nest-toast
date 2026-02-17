import 'reflect-metadata';
import { BPMN_PROCESS_METADATA_KEY } from '../constants';
import type { BpmnProcessOptions } from '../interfaces/bpmn-process.interface';

export function BpmnProcess(options: BpmnProcessOptions): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(BPMN_PROCESS_METADATA_KEY, options, target);
  };
}
