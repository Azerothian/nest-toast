import { TextFieldEntry, CheckboxEntry, isTextFieldEntryEdited, isCheckboxEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

function getOrCreateTaskConfig(element: any, bpmnFactory: any, commandStack: any) {
  const bo = element.businessObject;
  let taskConfig = bo.get('toast:taskConfig');
  if (!taskConfig) {
    taskConfig = bpmnFactory.create('toast:TaskConfig');
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: bo,
      properties: { 'toast:taskConfig': taskConfig },
    });
  }
  return taskConfig;
}

function ChainEventNameEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const taskConfig = element.businessObject.get('toast:taskConfig');
    return taskConfig?.chainEventName || '';
  };

  const setValue = (value: string) => {
    const taskConfig = getOrCreateTaskConfig(element, bpmnFactory, commandStack);
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: taskConfig,
      properties: { chainEventName: value },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Chain Event Name'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function InputTypeEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const taskConfig = element.businessObject.get('toast:taskConfig');
    return taskConfig?.inputType || '';
  };

  const setValue = (value: string) => {
    const taskConfig = getOrCreateTaskConfig(element, bpmnFactory, commandStack);
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: taskConfig,
      properties: { inputType: value },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Input Type'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function OutputTypeEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const taskConfig = element.businessObject.get('toast:taskConfig');
    return taskConfig?.outputType || '';
  };

  const setValue = (value: string) => {
    const taskConfig = getOrCreateTaskConfig(element, bpmnFactory, commandStack);
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: taskConfig,
      properties: { outputType: value },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Output Type'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function TimeoutEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const taskConfig = element.businessObject.get('toast:taskConfig');
    return taskConfig?.timeout?.toString() || '';
  };

  const setValue = (value: string) => {
    const taskConfig = getOrCreateTaskConfig(element, bpmnFactory, commandStack);
    const numValue = value ? parseInt(value, 10) : undefined;
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: taskConfig,
      properties: { timeout: numValue },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Timeout (ms)'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function TypeConstraintTypeNameEntry({ element, constraint, index, id }: { element: any; constraint: any; index: number; id: string }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  const getValue = () => constraint.typeName || '';

  const setValue = (value: string) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: constraint,
      properties: { typeName: value },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate(`Type Name #${index + 1}`),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function TypeConstraintRequiredEntry({ element, constraint, index, id }: { element: any; constraint: any; index: number; id: string }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  const getValue = () => constraint.required || false;

  const setValue = (value: boolean) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: constraint,
      properties: { required: value },
    });
  };

  return CheckboxEntry({
    element,
    id,
    label: translate(`Required #${index + 1}`),
    getValue,
    setValue,
  });
}

export function taskConfigEntries(element: any) {
  const entries: any[] = [
    {
      id: 'toast-chainEventName',
      component: ChainEventNameEntry,
      isEdited: isTextFieldEntryEdited,
    },
    {
      id: 'toast-inputType',
      component: InputTypeEntry,
      isEdited: isTextFieldEntryEdited,
    },
    {
      id: 'toast-outputType',
      component: OutputTypeEntry,
      isEdited: isTextFieldEntryEdited,
    },
    {
      id: 'toast-timeout',
      component: TimeoutEntry,
      isEdited: isTextFieldEntryEdited,
    },
  ];

  // Add type constraint entries
  const taskConfig = element.businessObject.get('toast:taskConfig');
  const constraints = taskConfig?.typeConstraints || [];

  constraints.forEach((constraint: any, index: number) => {
    entries.push(
      {
        id: `toast-typeConstraint-typeName-${index}`,
        component: (props: any) =>
          TypeConstraintTypeNameEntry({ ...props, constraint, index }),
        isEdited: isTextFieldEntryEdited,
      },
      {
        id: `toast-typeConstraint-required-${index}`,
        component: (props: any) =>
          TypeConstraintRequiredEntry({ ...props, constraint, index }),
        isEdited: isCheckboxEntryEdited,
      },
    );
  });

  return entries;
}
