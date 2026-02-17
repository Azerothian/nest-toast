import { Inject } from '@nestjs/common';
import { BPMN_TRIGGER_INJECT_KEY } from '../constants';
import type { BpmnExecutorService } from '../services/bpmn-executor.service';

export function InjectBpmnTrigger(processName: string): ParameterDecorator {
  return Inject(`${BPMN_TRIGGER_INJECT_KEY}:${processName}`);
}

export function TypeScriptTrigger<I = unknown, O = unknown>(processName: string) {
  return {
    provide: `${BPMN_TRIGGER_INJECT_KEY}:${processName}`,
    useFactory: (executor: BpmnExecutorService) => {
      return async (input: I): Promise<O> => {
        return executor.execute<I, O>(processName, input);
      };
    },
    inject: ['BpmnExecutorService'],
  };
}
