import { TextFieldEntry, isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

function getOrCreateProcessConfig(element: any, bpmnFactory: any, commandStack: any) {
  const bo = element.businessObject;
  // For participants, get the process
  const process = bo.processRef || bo;
  let processConfig = process.get('toast:processConfig');
  if (!processConfig) {
    processConfig = bpmnFactory.create('toast:ProcessConfig');
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: process,
      properties: { 'toast:processConfig': processConfig },
    });
  }
  return processConfig;
}

function getProcess(element: any) {
  const bo = element.businessObject;
  return bo.processRef || bo;
}

function VersionEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const processConfig = getProcess(element).get('toast:processConfig');
    return processConfig?.version || '';
  };

  const setValue = (value: string) => {
    const processConfig = getOrCreateProcessConfig(element, bpmnFactory, commandStack);
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: processConfig,
      properties: { version: value },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Version'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function DescriptionEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const processConfig = getProcess(element).get('toast:processConfig');
    return processConfig?.description || '';
  };

  const setValue = (value: string) => {
    const processConfig = getOrCreateProcessConfig(element, bpmnFactory, commandStack);
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: processConfig,
      properties: { description: value },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Description'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function RetryMaxRetriesEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const processConfig = getProcess(element).get('toast:processConfig');
    return processConfig?.retryMaxRetries?.toString() || '';
  };

  const setValue = (value: string) => {
    const processConfig = getOrCreateProcessConfig(element, bpmnFactory, commandStack);
    const numValue = value ? parseInt(value, 10) : undefined;
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: processConfig,
      properties: { retryMaxRetries: numValue },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Max Retries'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function RetryBackoffMsEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const processConfig = getProcess(element).get('toast:processConfig');
    return processConfig?.retryBackoffMs?.toString() || '';
  };

  const setValue = (value: string) => {
    const processConfig = getOrCreateProcessConfig(element, bpmnFactory, commandStack);
    const numValue = value ? parseInt(value, 10) : undefined;
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: processConfig,
      properties: { retryBackoffMs: numValue },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Backoff (ms)'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

function RetryBackoffMultiplierEntry({ element, id }: { element: any; id: string }) {
  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    const processConfig = getProcess(element).get('toast:processConfig');
    return processConfig?.retryBackoffMultiplier?.toString() || '';
  };

  const setValue = (value: string) => {
    const processConfig = getOrCreateProcessConfig(element, bpmnFactory, commandStack);
    const numValue = value ? parseFloat(value) : undefined;
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: processConfig,
      properties: { retryBackoffMultiplier: numValue },
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Backoff Multiplier'),
    getValue,
    setValue,
    debounce: useService('debounce'),
  });
}

export function processConfigEntries(element: any) {
  return [
    {
      id: 'toast-version',
      component: VersionEntry,
      isEdited: isTextFieldEntryEdited,
    },
    {
      id: 'toast-description',
      component: DescriptionEntry,
      isEdited: isTextFieldEntryEdited,
    },
    {
      id: 'toast-retryMaxRetries',
      component: RetryMaxRetriesEntry,
      isEdited: isTextFieldEntryEdited,
    },
    {
      id: 'toast-retryBackoffMs',
      component: RetryBackoffMsEntry,
      isEdited: isTextFieldEntryEdited,
    },
    {
      id: 'toast-retryBackoffMultiplier',
      component: RetryBackoffMultiplierEntry,
      isEdited: isTextFieldEntryEdited,
    },
  ];
}
