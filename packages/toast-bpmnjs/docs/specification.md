# @azerothian/toast-bpmnjs Specification

## Table of Contents

1. [Purpose and Goals](#purpose-and-goals)
2. [Plugin Interface Contract](#plugin-interface-contract)
3. [Extension Attributes](#extension-attributes)
4. [Component API](#component-api)
5. [Hook API](#hook-api)
6. [Example Usage Patterns](#example-usage-patterns)
7. [Integration Guide](#integration-guide)

---

## Purpose and Goals

`@azerothian/toast-bpmnjs` is a React library that wraps [bpmn-js](https://github.com/bpmn-io/bpmn-js) with custom properties panel support for Toast BPMN extensions. It enables visual BPMN diagram editing with type-safe configuration of blockchain event handlers, input/output types, retry policies, and runtime constraints.

### Key Goals

- **Plugin-Based Architecture**: Decouple diagram persistence, data fetching, and validation through a flexible plugin interface
- **Type Safety**: Enforce schema validation for Toast BPMN extensions (TaskConfig, ProcessConfig, TypeConstraint)
- **React Integration**: Provide both component-based and hook-based APIs for seamless React integration
- **Extensibility**: Support custom data sources (databases, APIs) via plugin implementation
- **Developer Experience**: Clear contracts, comprehensive examples, and zero boilerplate defaults

---

## Plugin Interface Contract

The `IToastBpmnPlugin` interface defines the contract between the editor and external systems. All methods are optional, allowing you to implement only what your use case requires.

### Interface Definition

```typescript
interface IToastBpmnPlugin {
  loadDiagram?(diagramId: string): Promise<string>;
  saveDiagram?(diagramId: string, xml: string): Promise<void>;
  getChainEventNames?(): Promise<string[]>;
  getTypeNames?(): Promise<string[]>;
  validate?(xml: string): Promise<ValidationResult[]>;
  onDiagramChanged?(xml: string): void;
  onElementSelected?(element: unknown): void;
}
```

### Method Reference

#### `loadDiagram(diagramId: string): Promise<string>`

Load a BPMN diagram by ID. Used when the editor initializes or when explicitly loading a diagram.

**Parameters:**
- `diagramId` (string): Unique identifier for the diagram

**Returns:**
- Promise resolving to BPMN XML string

**Example:**
```typescript
plugin.loadDiagram('order-process') 
  // => <bpmn:definitions...></bpmn:definitions>
```

**Use Cases:**
- Loading diagrams from a database
- Fetching diagrams from a REST API
- Loading from file system

---

#### `saveDiagram(diagramId: string, xml: string): Promise<void>`

Persist a BPMN diagram. Called when the user manually saves or auto-save triggers.

**Parameters:**
- `diagramId` (string): Unique identifier for the diagram
- `xml` (string): Complete BPMN XML document

**Returns:**
- Promise resolving when save completes

**Example:**
```typescript
plugin.saveDiagram('order-process', '<bpmn:definitions...>')
  // Saves to database or API
```

**Use Cases:**
- Writing to a database
- Uploading to a REST API
- Saving to file system
- Publishing versioned snapshots

---

#### `getChainEventNames(): Promise<string[]>`

Retrieve the list of available blockchain event names for TaskConfig.chainEventName assignment.

**Returns:**
- Promise resolving to array of event name strings

**Example:**
```typescript
plugin.getChainEventNames()
  // => ['Transfer', 'Approval', 'OrderCreated', 'PaymentProcessed']
```

**Use Cases:**
- Populating dropdown menus in the properties panel
- Validating task event assignments
- Documenting available events in the contract

---

#### `getTypeNames(): Promise<string[]>`

Retrieve the list of available type names for TaskConfig.inputType, outputType, and TypeConstraint.typeName assignment.

**Returns:**
- Promise resolving to array of type name strings

**Example:**
```typescript
plugin.getTypeNames()
  // => ['Address', 'uint256', 'OrderId', 'PaymentAmount']
```

**Use Cases:**
- Populating type dropdowns in properties panel
- Type validation during diagram save
- Enforcing strong typing for task I/O

---

#### `validate(xml: string): Promise<ValidationResult[]>`

Validate a BPMN diagram against custom rules and constraints.

**Parameters:**
- `xml` (string): BPMN XML to validate

**Returns:**
- Promise resolving to array of ValidationResult objects

**ValidationResult Structure:**
```typescript
interface ValidationResult {
  id: string;              // Unique validation error ID
  message: string;         // Human-readable message
  severity: 'error' | 'warning' | 'info';  // Severity level
  element?: string;        // Optional element ID where issue occurred
}
```

**Example:**
```typescript
plugin.validate(xml)
  // => [
  //   {
  //     id: 'missing-timeout',
  //     message: 'Task "Payment" missing timeout configuration',
  //     severity: 'error',
  //     element: 'Task_Payment'
  //   },
  //   {
  //     id: 'unused-type',
  //     message: 'Type constraint "uint128" never used',
  //     severity: 'warning'
  //   }
  // ]
```

**Use Cases:**
- Domain-specific validation rules
- Business logic enforcement
- Type constraint checking
- Timeout and retry policy validation

---

#### `onDiagramChanged(xml: string): void`

Callback invoked whenever the diagram changes. Use for debounced auto-save, state synchronization, or side effects.

**Parameters:**
- `xml` (string): Updated BPMN XML

**Example:**
```typescript
plugin.onDiagramChanged = (xml) => {
  debouncedAutoSave(xml);
  syncToCollaborators(xml);
};
```

**Use Cases:**
- Triggering auto-save with debouncing
- Syncing to real-time collaboration systems
- Logging changes for audit trails
- Updating related UI (e.g., unsaved indicator)

---

#### `onElementSelected(element: unknown): void`

Callback invoked when a user selects an element in the diagram (task, process, etc.).

**Parameters:**
- `element` (unknown): BPMN element object from bpmn-js modeler

**Example:**
```typescript
plugin.onElementSelected = (element) => {
  console.log('Selected:', element.id, element.type);
  updatePropertiesPanel(element);
};
```

**Use Cases:**
- Syncing element selection to external systems
- Loading contextual data based on selection
- Updating secondary panels or sidebars
- Triggering analytics events

---

## Extension Attributes

The Toast BPMN extension schema defines three custom element types that extend standard BPMN 2.0.

### Schema Namespace

- **URI**: `http://azerothian.io/schema/toast-bpmn`
- **Prefix**: `toast`
- **XML Tag Alias**: lowerCase

### TypeConstraint

Defines a single type constraint for task input validation.

**Properties:**

| Property | Type | Attribute | Default | Description |
|----------|------|-----------|---------|-------------|
| typeName | string | Yes | — | Type name to constrain (e.g., 'uint256', 'Address') |
| required | boolean | Yes | false | Whether this type is required for execution |

**XML Example:**
```xml
<toast:typeConstraint typeName="Address" required="true" />
<toast:typeConstraint typeName="uint256" required="false" />
```

**TypeScript Interface:**
```typescript
interface TypeConstraintAttributes {
  typeName: string;
  required: boolean;
}
```

---

### TaskConfig

Configures blockchain event handling and type safety for a BPMN task.

**Properties:**

| Property | Type | Attribute | Default | Description |
|----------|------|-----------|---------|-------------|
| chainEventName | string | Yes | — | Blockchain event to trigger (e.g., 'Transfer', 'OrderCreated') |
| inputType | string | Yes | — | Expected input type for the task |
| outputType | string | Yes | — | Expected output type produced by the task |
| timeout | integer | Yes | — | Task execution timeout in milliseconds |
| typeConstraints | TypeConstraint[] | No | [] | Array of type constraints for validation |

**XML Example:**
```xml
<bpmn:task id="Task_Payment" name="Process Payment">
  <bpmn:extensionElements>
    <toast:taskConfig 
      chainEventName="PaymentProcessed"
      inputType="PaymentRequest"
      outputType="TransactionHash"
      timeout="30000">
      <toast:typeConstraint typeName="uint256" required="true" />
      <toast:typeConstraint typeName="Address" required="true" />
    </toast:taskConfig>
  </bpmn:extensionElements>
</bpmn:task>
```

**TypeScript Interface:**
```typescript
interface TaskConfigAttributes {
  chainEventName?: string;
  inputType?: string;
  outputType?: string;
  timeout?: number;
  typeConstraints?: TypeConstraintAttributes[];
}
```

**Use Cases:**
- Mapping tasks to blockchain event handlers
- Enforcing input/output type contracts
- Setting task execution timeouts
- Validating type constraints before execution

---

### ProcessConfig

Configures process-level metadata and retry policy.

**Properties:**

| Property | Type | Attribute | Default | Description |
|----------|------|-----------|---------|-------------|
| version | string | Yes | — | Process version identifier (e.g., '1.0.0') |
| description | string | Yes | — | Human-readable process description |
| retryMaxRetries | integer | Yes | — | Maximum retry attempts for failed tasks |
| retryBackoffMs | integer | Yes | — | Base backoff delay in milliseconds |
| retryBackoffMultiplier | real | Yes | — | Exponential backoff multiplier (e.g., 2.0) |

**XML Example:**
```xml
<bpmn:process id="Process_OrderFulfillment" name="Order Fulfillment">
  <bpmn:extensionElements>
    <toast:processConfig
      version="2.1.0"
      description="Handles order processing and fulfillment"
      retryMaxRetries="3"
      retryBackoffMs="1000"
      retryBackoffMultiplier="2.0" />
  </bpmn:extensionElements>
  <!-- process contents -->
</bpmn:process>
```

**TypeScript Interface:**
```typescript
interface ProcessConfigAttributes {
  version?: string;
  description?: string;
  retryMaxRetries?: number;
  retryBackoffMs?: number;
  retryBackoffMultiplier?: number;
}
```

**Retry Policy Behavior:**

With `retryMaxRetries=3`, `retryBackoffMs=1000`, `retryBackoffMultiplier=2.0`:

```
Attempt 1: Immediate
Attempt 2: Wait 1000ms, then retry
Attempt 3: Wait 2000ms (1000 * 2), then retry
Attempt 4: Wait 4000ms (2000 * 2), then retry
Attempt 5: Fail after 4 retries exhausted
```

**Use Cases:**
- Versioning process definitions
- Documenting process intent and scope
- Configuring fault tolerance strategies
- Controlling backoff behavior for transient failures

---

## Component API

The library provides React components for integrating the BPMN editor into your application.

### BpmnEditor Component

Main editor component that renders the BPMN diagram and properties panel.

**Props:**

```typescript
interface BpmnEditorProps {
  xml?: string;
  onXmlChange?: (xml: string) => void;
  plugin?: IToastBpmnPlugin;
  height?: string | number;
  width?: string | number;
  onElementSelected?: (element: unknown) => void;
  onReady?: () => void;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| xml | string | undefined | Initial BPMN XML document |
| onXmlChange | function | undefined | Callback when diagram is modified |
| plugin | IToastBpmnPlugin | undefined | Plugin instance for data integration |
| height | string \| number | '100%' | Component height (CSS string or pixels) |
| width | string \| number | '100%' | Component width (CSS string or pixels) |
| onElementSelected | function | undefined | Callback when element is selected |
| onReady | function | undefined | Callback when editor is initialized |

**Example:**

```typescript
import { BpmnEditor } from '@azerothian/toast-bpmnjs';

function MyEditor() {
  const [xml, setXml] = useState<string>();

  return (
    <BpmnEditor
      xml={xml}
      onXmlChange={setXml}
      height="600px"
      width="100%"
      onReady={() => console.log('Editor ready')}
    />
  );
}
```

---

### PluginProvider Component

Context provider that supplies the plugin instance to child components.

**Props:**

```typescript
interface PluginProviderProps {
  plugin: IToastBpmnPlugin;
  children: ReactNode;
}
```

| Prop | Type | Description |
|------|------|-------------|
| plugin | IToastBpmnPlugin | Plugin instance to provide |
| children | ReactNode | Child components |

**Example:**

```typescript
import { PluginProvider, BpmnEditor } from '@azerothian/toast-bpmnjs';

const plugin: IToastBpmnPlugin = {
  getChainEventNames: async () => ['Transfer', 'Approval'],
  getTypeNames: async () => ['Address', 'uint256'],
};

export function App() {
  return (
    <PluginProvider plugin={plugin}>
      <BpmnEditor height="500px" />
    </PluginProvider>
  );
}
```

---

## Hook API

The library provides React hooks for advanced use cases and headless integration.

### useBpmnEditor Hook

Access the underlying bpmn-js modeler instance and import/export methods.

**Options:**

```typescript
interface UseBpmnEditorOptions {
  xml?: string;
  onXmlChange?: (xml: string) => void;
}
```

**Returns:**

```typescript
interface UseBpmnEditorResult {
  modeler: unknown | null;
  importXml: (xml: string) => Promise<void>;
  exportXml: () => Promise<string>;
  getElement: (id: string) => unknown | undefined;
}
```

| Property | Type | Description |
|----------|------|-------------|
| modeler | object \| null | bpmn-js Modeler instance (null before initialization) |
| importXml | function | Load BPMN XML into the editor |
| exportXml | function | Get current diagram as BPMN XML string |
| getElement | function | Get a BPMN element by ID |

**Example:**

```typescript
import { useBpmnEditor } from '@azerothian/toast-bpmnjs';

function MyComponent() {
  const { modeler, importXml, exportXml, getElement } = useBpmnEditor({
    onXmlChange: (xml) => console.log('Changed:', xml),
  });

  const handleExport = async () => {
    const xml = await exportXml();
    console.log(xml);
  };

  const handleGetTask = () => {
    const task = getElement('Task_1');
    console.log('Task:', task);
  };

  return (
    <>
      <button onClick={handleExport}>Export</button>
      <button onClick={handleGetTask}>Get Task</button>
    </>
  );
}
```

---

### usePlugin Hook

Access the current plugin instance from context.

**Returns:**

```typescript
IToastBpmnPlugin | undefined
```

**Example:**

```typescript
import { usePlugin } from '@azerothian/toast-bpmnjs';

function PropertiesPanel() {
  const plugin = usePlugin();

  useEffect(() => {
    plugin?.getChainEventNames().then((events) => {
      console.log('Available events:', events);
    });
  }, [plugin]);

  return <div>Properties Panel</div>;
}
```

---

## Example Usage Patterns

### Pattern 1: Basic Editor with Inline XML

Minimal setup for editing a hardcoded BPMN diagram.

```typescript
import { useState } from 'react';
import { BpmnEditor } from '@azerothian/toast-bpmnjs';

const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="Event_1" />
  </bpmn:process>
</bpmn:definitions>`;

export function BasicEditor() {
  const [xml, setXml] = useState(INITIAL_XML);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1>BPMN Editor</h1>
      <BpmnEditor xml={xml} onXmlChange={setXml} />
      <details>
        <summary>XML Output</summary>
        <pre>{xml}</pre>
      </details>
    </div>
  );
}
```

---

### Pattern 2: Editor with Data-Fetching Plugin

Integrate with a backend API for loading and saving diagrams.

```typescript
import { useState } from 'react';
import { BpmnEditor, PluginProvider } from '@azerothian/toast-bpmnjs';
import type { IToastBpmnPlugin } from '@azerothian/toast-bpmnjs';

const plugin: IToastBpmnPlugin = {
  loadDiagram: async (diagramId) => {
    const response = await fetch(`/api/diagrams/${diagramId}`);
    return response.text();
  },

  saveDiagram: async (diagramId, xml) => {
    await fetch(`/api/diagrams/${diagramId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });
  },

  getChainEventNames: async () => {
    const response = await fetch('/api/chain-events');
    return response.json();
  },

  getTypeNames: async () => {
    const response = await fetch('/api/types');
    return response.json();
  },

  validate: async (xml) => {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });
    return response.json();
  },
};

export function ApiIntegratedEditor({ diagramId }: { diagramId: string }) {
  const [xml, setXml] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!xml) return;
    setIsSaving(true);
    try {
      await plugin.saveDiagram?.(diagramId, xml);
      console.log('Saved successfully');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PluginProvider plugin={plugin}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <BpmnEditor
          xml={xml}
          onXmlChange={setXml}
          onReady={async () => {
            const loaded = await plugin.loadDiagram?.(diagramId);
            if (loaded) setXml(loaded);
          }}
        />
      </div>
    </PluginProvider>
  );
}
```

---

### Pattern 3: Using TanStack React Query

Manage diagram loading and saving with advanced caching and state management.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BpmnEditor, PluginProvider } from '@azerothian/toast-bpmnjs';
import type { IToastBpmnPlugin } from '@azerothian/toast-bpmnjs';

const queryClient = new QueryClient();

const plugin: IToastBpmnPlugin = {
  loadDiagram: async (diagramId) => {
    const data = await queryClient.fetchQuery({
      queryKey: ['diagram', diagramId],
      queryFn: async () => {
        const response = await fetch(`/api/diagrams/${diagramId}`);
        return response.text();
      },
    });
    return data;
  },

  saveDiagram: async (diagramId, xml) => {
    await queryClient.setQueryData(['diagram', diagramId], xml);
    // Optional: persist to server with mutation
  },

  getChainEventNames: async () => {
    return queryClient.fetchQuery({
      queryKey: ['chainEvents'],
      queryFn: async () => {
        const response = await fetch('/api/chain-events');
        return response.json();
      },
    });
  },

  getTypeNames: async () => {
    return queryClient.fetchQuery({
      queryKey: ['types'],
      queryFn: async () => {
        const response = await fetch('/api/types');
        return response.json();
      },
    });
  },
};

export function ReactQueryEditor({ diagramId }: { diagramId: string }) {
  const { data: xml, isLoading } = useQuery({
    queryKey: ['diagram', diagramId],
    queryFn: async () => {
      const response = await fetch(`/api/diagrams/${diagramId}`);
      return response.text();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (newXml: string) =>
      fetch(`/api/diagrams/${diagramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/xml' },
        body: newXml,
      }),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <PluginProvider plugin={plugin}>
      <BpmnEditor
        xml={xml}
        onXmlChange={(newXml) => saveMutation.mutate(newXml)}
      />
    </PluginProvider>
  );
}
```

---

### Pattern 4: Headless Usage with Custom UI

Use the hook API to build custom UI around the editor logic.

```typescript
import { useBpmnEditor } from '@azerothian/toast-bpmnjs';

export function HeadlessEditor() {
  const { modeler, importXml, exportXml, getElement } = useBpmnEditor();
  const [elements, setElements] = useState<any[]>([]);

  const handleListElements = () => {
    if (!modeler) return;
    // Assuming modeler has a way to list elements
    const allElements = modeler.get('elementRegistry').getAll();
    setElements(allElements);
  };

  const handleExportAndLog = async () => {
    const xml = await exportXml();
    console.log('Diagram XML:', xml);
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={handleListElements}>List Elements</button>
        <button onClick={handleExportAndLog}>Export</button>
      </div>
      <div>
        <h3>Elements:</h3>
        <ul>
          {elements.map((el) => (
            <li key={el.id}>
              {el.id} ({el.type})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

## Integration Guide

### Step 1: Installation

```bash
npm install @azerothian/toast-bpmnjs bpmn-js bpmn-moddle
```

### Step 2: Import Styles

```typescript
import '@azerothian/toast-bpmnjs/styles/editor.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
```

### Step 3: Create Plugin Instance

```typescript
const plugin: IToastBpmnPlugin = {
  // Implement methods as needed
  getChainEventNames: async () => ['Event1', 'Event2'],
  getTypeNames: async () => ['Type1', 'Type2'],
};
```

### Step 4: Wrap with PluginProvider

```typescript
<PluginProvider plugin={plugin}>
  <BpmnEditor />
</PluginProvider>
```

### Step 5: Handle State

```typescript
const [xml, setXml] = useState<string>();

<BpmnEditor xml={xml} onXmlChange={setXml} />
```

---

## Best Practices

1. **Plugin Methods are Optional**: Implement only the methods your use case requires. The editor works without a plugin.

2. **Debounce Save Operations**: If using `onDiagramChanged` for auto-save, debounce the save call to avoid excessive requests.

3. **Memoize Plugin Instance**: Keep your plugin instance stable to avoid unnecessary re-renders:
   ```typescript
   const plugin = useMemo(() => ({ ... }), []);
   ```

4. **Validate Before Export**: Call the plugin's `validate` method before exporting diagrams to catch issues early.

5. **Handle Async Operations**: All plugin methods are async. Use try-catch or `.catch()` for error handling.

6. **Use TypeScript**: Leverage TypeScript types for BpmnEditorProps, TaskConfigAttributes, and ProcessConfigAttributes to catch errors at development time.

---

## Troubleshooting

**Issue**: Diagram doesn't load
- Check that XML is valid BPMN 2.0
- Ensure `plugin.loadDiagram()` is awaited and returns valid XML

**Issue**: Properties panel shows no options
- Verify plugin is provided via PluginProvider
- Check `getChainEventNames()` and `getTypeNames()` are implemented
- Look for console errors in browser DevTools

**Issue**: Changes aren't persisted
- Implement `saveDiagram()` in your plugin
- Ensure `onXmlChange` callback is connected
- Consider debouncing auto-save to reduce API calls

**Issue**: TypeScript errors
- Ensure all extension attributes match the types.ts interface definitions
- Check that diagram XML includes the correct namespace URI

---

## Version Information

- **Package Version**: 0.1.0
- **bpmn-js Dependency**: ^17.0.0
- **React Peer Dependency**: ^18.0.0 || ^19.0.0
- **Schema Namespace**: http://azerothian.io/schema/toast-bpmn
