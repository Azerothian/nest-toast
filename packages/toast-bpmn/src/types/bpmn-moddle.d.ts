declare module 'bpmn-moddle' {
  export interface ModdleElement {
    $type: string;
    $attrs?: Record<string, string>;
    id?: string;
    name?: string;
    [key: string]: unknown;
  }

  export interface Definitions extends ModdleElement {
    rootElements: ModdleElement[];
  }

  export interface ParseResult {
    rootElement: Definitions;
    elementsById: Record<string, ModdleElement>;
    references: Array<{ property: string; id: string; element: ModdleElement }>;
    warnings: Array<{ message: string }>;
  }

  export interface ModdleOptions {
    [key: string]: unknown;
  }

  export default class BpmnModdle {
    constructor(packages?: Record<string, unknown>);
    fromXML(xml: string): Promise<ParseResult>;
    toXML(element: ModdleElement): Promise<{ xml: string }>;
    create(type: string, attrs?: Record<string, unknown>): ModdleElement;
  }
}
