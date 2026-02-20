import { useRef, useEffect, type ReactNode } from 'react';
import Modeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import { PluginProvider } from '../context/PluginContext';
import { toastPropertiesProviderModule } from '../extensions/toast-properties-provider';
import toastExtension from '../schema/toast-extension.json';
import type { BpmnEditorProps } from '../types';

function createDebounce() {
  return function debounce(fn: (...args: unknown[]) => void) {
    let timeout: ReturnType<typeof setTimeout>;
    return function (this: unknown, ...args: unknown[]) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), 300);
    };
  };
}

const debounceModule = {
  debounceInput: ['factory', createDebounce],
  debounce: ['factory', createDebounce],
};

export function BpmnEditor({
  xml,
  onXmlChange,
  plugin,
  height,
  width,
  onElementSelected,
  onReady,
  children,
}: BpmnEditorProps & { children?: ReactNode }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const initialXmlRef = useRef(xml);

  useEffect(() => {
    if (!canvasRef.current || !panelRef.current) return;

    const modeler = new Modeler({
      container: canvasRef.current,
      propertiesPanel: {
        parent: panelRef.current,
      },
      moddleExtensions: {
        toast: toastExtension,
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        toastPropertiesProviderModule,
        debounceModule,
      ],
    });

    modelerRef.current = modeler;

    const initDiagram = async () => {
      if (initialXmlRef.current) {
        await modeler.importXML(initialXmlRef.current);
      } else {
        await modeler.createDiagram();
      }

      onReady?.();
    };

    initDiagram().catch(console.error);

    modeler.on('commandStack.changed', async () => {
      if (onXmlChange) {
        try {
          const { xml: exportedXml } = await modeler.saveXML({ format: true });
          if (exportedXml) {
            onXmlChange(exportedXml);
          }
        } catch (err) {
          console.error('Failed to export XML:', err);
        }
      }
    });

    modeler.on('selection.changed', ({ newSelection }: { newSelection: unknown[] }) => {
      if (onElementSelected) {
        onElementSelected(newSelection.length > 0 ? newSelection[0] : null);
      }
    });

    return () => {
      modeler.destroy();
      modelerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!modelerRef.current || xml === undefined || xml === initialXmlRef.current) return;
    initialXmlRef.current = xml;
    modelerRef.current.importXML(xml).catch(console.error);
  }, [xml]);

  const content = (
    <div style={{ display: 'flex', height: height || '100%', width: width || '100%' }}>
      <div ref={canvasRef} style={{ flex: 1 }} />
      <div
        ref={panelRef}
        style={{ width: '300px', borderLeft: '1px solid #ccc', overflow: 'auto' }}
      />
    </div>
  );

  if (plugin) {
    return <PluginProvider plugin={plugin}>{content}{children}</PluginProvider>;
  }

  return <>{content}{children}</>;
}
