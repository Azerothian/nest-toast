import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { BpmnProcess } from '../../../decorators/bpmn-process.decorator';
import type { BpmnProcessOptions } from '../../../interfaces/bpmn-process.interface';
import { BPMN_PROCESS_METADATA_KEY } from '../../../constants';

describe('BpmnProcess decorator', () => {
  it('should set process metadata on the class', () => {
    const options: BpmnProcessOptions = { name: 'OrderProcess' };

    @BpmnProcess(options)
    class OrderProcess {}

    const metadata = Reflect.getMetadata(BPMN_PROCESS_METADATA_KEY, OrderProcess);
    expect(metadata).toEqual(options);
  });

  it('should set metadata with description and version', () => {
    const options: BpmnProcessOptions = {
      name: 'ShipmentProcess',
      description: 'Handles shipment',
      version: '1.0.0',
    };

    @BpmnProcess(options)
    class ShipmentProcess {}

    const metadata = Reflect.getMetadata(BPMN_PROCESS_METADATA_KEY, ShipmentProcess);
    expect(metadata.name).toBe('ShipmentProcess');
    expect(metadata.description).toBe('Handles shipment');
    expect(metadata.version).toBe('1.0.0');
  });

  it('should store exact options reference fields', () => {
    const options: BpmnProcessOptions = { name: 'PaymentProcess' };

    @BpmnProcess(options)
    class PaymentProcess {}

    const metadata = Reflect.getMetadata(BPMN_PROCESS_METADATA_KEY, PaymentProcess);
    expect(metadata).toBe(options);
  });

  it('should not leak metadata between classes', () => {
    @BpmnProcess({ name: 'ProcessA' })
    class ProcessA {}

    @BpmnProcess({ name: 'ProcessB' })
    class ProcessB {}

    expect(Reflect.getMetadata(BPMN_PROCESS_METADATA_KEY, ProcessA).name).toBe('ProcessA');
    expect(Reflect.getMetadata(BPMN_PROCESS_METADATA_KEY, ProcessB).name).toBe('ProcessB');
  });
});
