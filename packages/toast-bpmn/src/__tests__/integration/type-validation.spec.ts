import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ToastModule } from '@azerothian/toast';
import { ToastBpmnModule } from '../../toast-bpmn.module';
import { BpmnLoaderService } from '../../services/bpmn-loader.service';
import { BpmnValidatorService } from '../../services/bpmn-validator.service';
import { BpmnTypeRegistryService } from '../../services/bpmn-type-registry.service';

const FIXTURES_DIR = join(__dirname, '../../../test/fixtures');

describe('TC-P-006 to TC-P-010: Type Validation and Structural Checks', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let validator: BpmnValidatorService;
  let typeRegistry: BpmnTypeRegistryService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
    }).compile();

    await moduleRef.init();

    loader = moduleRef.get(BpmnLoaderService);
    validator = moduleRef.get(BpmnValidatorService);
    typeRegistry = moduleRef.get(BpmnTypeRegistryService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('TC-P-006: Types registered before validation - no type warnings', () => {
    it('validates order-fulfillment with all types registered - no TYPE_W001 or TYPE_W002 warnings', async () => {
      // Register all types used by order-fulfillment.bpmn
      typeRegistry.register('OrderInput');
      typeRegistry.register('ValidatedOrder');
      typeRegistry.register('InventoryResult');
      typeRegistry.register('PaymentResult');
      typeRegistry.register('ShipmentResult');

      const xml = readFileSync(join(FIXTURES_DIR, 'order-fulfillment.bpmn'), 'utf-8');
      const definition = await loader.loadFromString(xml);
      const result = validator.validate(definition);

      const typeWarnings = result.warnings.filter(
        w => w.code === 'TYPE_W001' || w.code === 'TYPE_W002',
      );
      expect(typeWarnings).toHaveLength(0);
    });
  });

  describe('TC-P-007: Unregistered types produce warnings', () => {
    it('validates invalid-type-mismatch.bpmn - warns for each unregistered inputType and outputType', async () => {
      // Do NOT register any types - all 4 types (UnregisteredTypeA-D) are unknown
      const xml = readFileSync(join(FIXTURES_DIR, 'invalid-type-mismatch.bpmn'), 'utf-8');
      const definition = await loader.loadFromString(xml);
      const result = validator.validate(definition);

      const typeW001Warnings = result.warnings.filter(w => w.code === 'TYPE_W001');
      const typeW002Warnings = result.warnings.filter(w => w.code === 'TYPE_W002');

      // Task_A has inputType=UnregisteredTypeA, Task_B has inputType=UnregisteredTypeC
      expect(typeW001Warnings.length).toBeGreaterThanOrEqual(2);
      // Task_A has outputType=UnregisteredTypeB, Task_B has outputType=UnregisteredTypeD
      expect(typeW002Warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('TC-P-008: Structural errors - missing start event', () => {
    it('validates invalid-no-start.bpmn - reports STRUCT_002 error', async () => {
      const xml = readFileSync(join(FIXTURES_DIR, 'invalid-no-start.bpmn'), 'utf-8');
      const definition = await loader.loadFromString(xml);
      const result = validator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRUCT_002')).toBe(true);
    });
  });

  describe('TC-P-009: Structural errors - missing end event', () => {
    it('validates a process with no end event - reports STRUCT_003 error', async () => {
      // Build a definition with no end events directly
      const definition = {
        name: 'NoEndProcess',
        tasks: [
          { id: 'task1', name: 'Task 1', type: 'serviceTask' as const, chainEventName: 'some.event', incoming: [], outgoing: [] },
        ],
        flows: [
          { id: 'flow1', sourceRef: 'start1', targetRef: 'task1' },
        ],
        startEvents: [{ id: 'start1', name: 'Start', outgoing: ['flow1'] }],
        endEvents: [],
        gateways: [],
      };
      const result = validator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRUCT_003')).toBe(true);
    });
  });

  describe('TC-P-009b: Structural errors - duplicate task IDs', () => {
    it('validates a process with duplicate task IDs - reports STRUCT_004 error', async () => {
      const definition = {
        name: 'DuplicateIdProcess',
        tasks: [
          { id: 'task1', name: 'Task A', type: 'serviceTask' as const, chainEventName: 'event.a', incoming: [], outgoing: [] },
          { id: 'task1', name: 'Task B', type: 'serviceTask' as const, chainEventName: 'event.b', incoming: [], outgoing: [] },
        ],
        flows: [
          { id: 'flow1', sourceRef: 'start1', targetRef: 'task1' },
          { id: 'flow2', sourceRef: 'task1', targetRef: 'end1' },
        ],
        startEvents: [{ id: 'start1', name: 'Start', outgoing: ['flow1'] }],
        endEvents: [{ id: 'end1', name: 'End', incoming: ['flow2'] }],
        gateways: [],
      };
      const result = validator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRUCT_004' && e.taskId === 'task1')).toBe(true);
    });
  });

  describe('TC-P-010: Flow warnings - service task without chainEventName', () => {
    it('validates invalid-missing-handler.bpmn - warns FLOW_W001 for task without chainEventName', async () => {
      const xml = readFileSync(join(FIXTURES_DIR, 'invalid-missing-handler.bpmn'), 'utf-8');
      const definition = await loader.loadFromString(xml);
      const result = validator.validate(definition);

      expect(result.warnings.some(w => w.code === 'FLOW_W001')).toBe(true);
    });
  });

  describe('TC-P-010b: Flow errors - invalid source/target refs', () => {
    it('validates a process with invalid flow sourceRef - reports FLOW_001 error', async () => {
      const definition = {
        name: 'InvalidFlowProcess',
        tasks: [
          { id: 'task1', name: 'Task 1', type: 'serviceTask' as const, chainEventName: 'some.event', incoming: [], outgoing: [] },
        ],
        flows: [
          { id: 'flow1', sourceRef: 'start1', targetRef: 'task1' },
          { id: 'flow2', sourceRef: 'task1', targetRef: 'end1' },
          { id: 'flow3', sourceRef: 'nonexistent', targetRef: 'end1' },
        ],
        startEvents: [{ id: 'start1', name: 'Start', outgoing: ['flow1'] }],
        endEvents: [{ id: 'end1', name: 'End', incoming: ['flow2'] }],
        gateways: [],
      };
      const result = validator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FLOW_001')).toBe(true);
    });

    it('validates a process with invalid flow targetRef - reports FLOW_002 error', async () => {
      const definition = {
        name: 'InvalidTargetProcess',
        tasks: [
          { id: 'task1', name: 'Task 1', type: 'serviceTask' as const, chainEventName: 'some.event', incoming: [], outgoing: [] },
        ],
        flows: [
          { id: 'flow1', sourceRef: 'start1', targetRef: 'task1' },
          { id: 'flow2', sourceRef: 'task1', targetRef: 'end1' },
          { id: 'flow3', sourceRef: 'start1', targetRef: 'nonexistent' },
        ],
        startEvents: [{ id: 'start1', name: 'Start', outgoing: ['flow1'] }],
        endEvents: [{ id: 'end1', name: 'End', incoming: ['flow2'] }],
        gateways: [],
      };
      const result = validator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FLOW_002')).toBe(true);
    });
  });
});
