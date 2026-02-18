import { useRef, useEffect } from 'react';
import Modeler from 'bpmn-js/lib/Modeler';
import toastExtension from '../schema/toast-extension.json';
import type { UseBpmnEditorOptions, UseBpmnEditorResult } from '../types';

export function useBpmnEditor(options: UseBpmnEditorOptions = {}): UseBpmnEditorResult {
  const { onXmlChange } = options;

  const modelerRef = useRef<any>(null);

  if (!modelerRef.current) {
    modelerRef.current = new Modeler({
      moddleExtensions: {
        toast: toastExtension,
      },
    });
  }

  useEffect(() => {
    const modeler = modelerRef.current;

    if (onXmlChange) {
      modeler.on('commandStack.changed', async () => {
        try {
          const { xml } = await modeler.saveXML({ format: true });
          if (xml) {
            onXmlChange(xml);
          }
        } catch (err) {
          console.error('Failed to export XML:', err);
        }
      });
    }

    return () => {
      modeler.destroy();
      modelerRef.current = null;
    };
  }, []);

  const importXml = async (xml: string): Promise<void> => {
    if (!modelerRef.current) throw new Error('Modeler not initialized');
    await modelerRef.current.importXML(xml);
  };

  const exportXml = async (): Promise<string> => {
    if (!modelerRef.current) throw new Error('Modeler not initialized');
    const { xml } = await modelerRef.current.saveXML({ format: true });
    return xml ?? '';
  };

  const getElement = (id: string): unknown | undefined => {
    if (!modelerRef.current) return undefined;
    const elementRegistry = modelerRef.current.get('elementRegistry');
    return elementRegistry?.get(id);
  };

  return {
    modeler: modelerRef.current,
    importXml,
    exportXml,
    getElement,
  };
}
