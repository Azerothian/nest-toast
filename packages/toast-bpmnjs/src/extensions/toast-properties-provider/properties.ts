import { is } from 'bpmn-js/lib/util/ModelUtil';
import { taskConfigEntries } from './TaskConfigProps';
import { processConfigEntries } from './ProcessConfigProps';

function isTaskLike(element: any): boolean {
  return (
    is(element, 'bpmn:Task') ||
    is(element, 'bpmn:ServiceTask') ||
    is(element, 'bpmn:UserTask') ||
    is(element, 'bpmn:ScriptTask') ||
    is(element, 'bpmn:SendTask') ||
    is(element, 'bpmn:ReceiveTask')
  );
}

export function getToastGroups(element: any) {
  const groups: any[] = [];

  if (isTaskLike(element)) {
    groups.push({
      id: 'toast-task-config',
      label: 'Toast Task Config',
      entries: taskConfigEntries(element),
    });
  }

  if (is(element, 'bpmn:Process') || is(element, 'bpmn:Participant')) {
    groups.push({
      id: 'toast-process-config',
      label: 'Toast Process Config',
      entries: processConfigEntries(element),
    });
  }

  return groups;
}
