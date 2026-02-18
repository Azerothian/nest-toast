declare module 'bpmn-js/lib/Modeler' {
  class Modeler {
    constructor(options?: any);
    importXML(xml: string): Promise<any>;
    saveXML(options?: any): Promise<{ xml?: string }>;
    createDiagram(): Promise<any>;
    destroy(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    get(service: string): any;
  }
  export default Modeler;
}

declare module 'bpmn-js/lib/util/ModelUtil' {
  export function is(element: any, type: string): boolean;
  export function getBusinessObject(element: any): any;
}

declare module 'bpmn-js-properties-panel' {
  export const BpmnPropertiesPanelModule: any;
  export const BpmnPropertiesProviderModule: any;
  export function useService(service: string): any;
}

declare module '@bpmn-io/properties-panel' {
  export function TextFieldEntry(props: any): any;
  export function CheckboxEntry(props: any): any;
  export function isTextFieldEntryEdited(node: any): boolean;
  export function isCheckboxEntryEdited(node: any): boolean;
}
