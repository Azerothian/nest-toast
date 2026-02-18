import { useState, useRef } from 'react';
import { BpmnEditor } from '@azerothian/toast-bpmnjs';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js-properties-panel/dist/assets/properties-panel.css';
import { useDiagram } from './hooks/useDiagram';
import { apiPlugin } from './plugins/api-plugin';

const DIAGRAM_OPTIONS = ['demo-1', 'demo-2', 'demo-3'];

function DiagramEditor({ diagramId }: { diagramId: string }) {
  const { data: xml, isLoading, isError, save, isSaving } = useDiagram(apiPlugin, diagramId);
  const currentXmlRef = useRef<string>('');

  if (isLoading) {
    return (
      <div style={styles.statusContainer}>
        <p style={styles.statusText}>Loading diagram...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={styles.statusContainer}>
        <p style={{ ...styles.statusText, color: '#ef4444' }}>Failed to load diagram.</p>
      </div>
    );
  }

  const handleXmlChange = (updatedXml: string) => {
    currentXmlRef.current = updatedXml;
    apiPlugin.onDiagramChanged?.(updatedXml);
  };

  const handleSave = () => {
    if (currentXmlRef.current) {
      save(currentXmlRef.current);
    }
  };

  return (
    <>
      <div style={styles.toolbar}>
        <span style={styles.diagramLabel}>Diagram: {diagramId}</span>
        <button
          style={isSaving ? { ...styles.saveButton, ...styles.saveButtonDisabled } : styles.saveButton}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div style={styles.editorContainer}>
        <BpmnEditor
          xml={xml}
          onXmlChange={handleXmlChange}
          plugin={apiPlugin}
          height="100%"
          width="100%"
        />
      </div>
    </>
  );
}

export default function App() {
  const [diagramId, setDiagramId] = useState('demo-1');

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Toast BPMN JS</h1>
        <div style={styles.headerControls}>
          <label style={styles.selectLabel} htmlFor="diagram-select">
            Diagram:
          </label>
          <select
            id="diagram-select"
            style={styles.select}
            value={diagramId}
            onChange={(e) => setDiagramId(e.target.value)}
          >
            {DIAGRAM_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      </header>
      <main style={styles.main}>
        <DiagramEditor key={diagramId} diagramId={diagramId} />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f8fafc',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '56px',
    background: '#1e293b',
    color: '#f1f5f9',
    flexShrink: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  selectLabel: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  select: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '14px',
    cursor: 'pointer',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  diagramLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  saveButton: {
    padding: '6px 18px',
    borderRadius: '6px',
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  saveButtonDisabled: {
    background: '#93c5fd',
    cursor: 'not-allowed',
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statusText: {
    color: '#64748b',
    fontSize: '16px',
  },
};
