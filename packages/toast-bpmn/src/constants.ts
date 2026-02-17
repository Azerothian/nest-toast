export const BPMN_PROCESS_METADATA_KEY = 'toast-bpmn:process:metadata';
export const BPMN_TASK_METADATA_KEY = 'toast-bpmn:task:metadata';
export const BPMN_CONTEXT_METADATA_KEY = 'toast-bpmn:context:metadata';
export const BPMN_TYPE_METADATA_KEY = 'toast-bpmn:type:metadata';
export const BPMN_TASK_HANDLERS_KEY = 'toast-bpmn:task:handlers';
export const BPMN_LIFECYCLE_START_KEY = 'toast-bpmn:lifecycle:start';
export const BPMN_LIFECYCLE_COMPLETE_KEY = 'toast-bpmn:lifecycle:complete';
export const BPMN_LIFECYCLE_ERROR_KEY = 'toast-bpmn:lifecycle:error';
export const BPMN_TRIGGER_MANUAL_KEY = 'toast-bpmn:trigger:manual';
export const BPMN_TRIGGER_TIMER_KEY = 'toast-bpmn:trigger:timer';
export const BPMN_TRIGGER_INJECT_KEY = 'toast-bpmn:trigger:inject';
export const TOAST_BPMN_MODULE_OPTIONS = 'TOAST_BPMN_MODULE_OPTIONS';

export const BPMN_EVENTS = {
  PROCESS_STARTED: 'bpmn.process.started',
  PROCESS_COMPLETED: 'bpmn.process.completed',
  PROCESS_FAILED: 'bpmn.process.failed',
  TASK_STARTED: 'bpmn.task.started',
  TASK_COMPLETED: 'bpmn.task.completed',
  TASK_FAILED: 'bpmn.task.failed',
} as const;
