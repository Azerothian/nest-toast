import type { IToastBpmnPlugin } from '@azerothian/toast-bpmnjs';
import { sampleDiagramXml } from '../mock/sample-diagram';

const diagrams: Record<string, string> = {
  'demo-1': sampleDiagramXml,
};

export const apiPlugin: IToastBpmnPlugin = {
  async loadDiagram(diagramId: string) {
    return diagrams[diagramId] || sampleDiagramXml;
  },
  async saveDiagram(diagramId: string, xml: string) {
    diagrams[diagramId] = xml;
    console.log(`Saved diagram ${diagramId}`);
  },
  async getChainEventNames() {
    return ['OrderCreated', 'OrderValidated', 'PaymentProcessed', 'OrderShipped'];
  },
  async getTypeNames() {
    return ['OrderInput', 'OrderOutput', 'PaymentInput', 'PaymentOutput'];
  },
  onDiagramChanged(xml: string) {
    console.log('Diagram changed, length:', xml.length);
  },
};
