import { describe, it, expect, beforeEach } from 'vitest';
import { BpmnValidatorService } from '../../services/bpmn-validator.service';
import { BpmnValidationError } from '../../errors/bpmn-validation.error';
import type { BpmnProcessDefinition } from '../../interfaces/bpmn-process.interface';
import type { BpmnTypeRegistryService } from '../../services/bpmn-type-registry.service';

function makeTypeRegistry(hasTypeResult = true): BpmnTypeRegistryService {
  return {
    hasType: () => hasTypeResult,
  } as unknown as BpmnTypeRegistryService;
}

function makeValidDefinition(): BpmnProcessDefinition {
  return {
    name: 'TestProcess',
    tasks: [
      {
        id: 'task1',
        name: 'My Task',
        type: 'serviceTask',
        chainEventName: 'myEvent',
      },
    ],
    flows: [
      { id: 'flow1', sourceRef: 'start1', targetRef: 'task1' },
      { id: 'flow2', sourceRef: 'task1', targetRef: 'end1' },
    ],
    startEvents: [{ id: 'start1', name: 'Start', outgoing: ['flow1'] }],
    endEvents: [{ id: 'end1', name: 'End', incoming: ['flow2'] }],
  };
}

describe('BpmnValidatorService', () => {
  let service: BpmnValidatorService;
  let typeRegistry: BpmnTypeRegistryService;

  beforeEach(() => {
    typeRegistry = makeTypeRegistry(true);
    service = new BpmnValidatorService(typeRegistry);
  });

  describe('validate - valid definition', () => {
    it('returns valid=true for a well-formed definition', () => {
      const result = service.validate(makeValidDefinition());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns warnings for serviceTask without chainEventName', () => {
      const def = makeValidDefinition();
      def.tasks[0].chainEventName = undefined;
      const result = service.validate(def);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'FLOW_W001')).toBe(true);
    });
  });

  describe('validate - structural errors', () => {
    it('errors when process has no name', () => {
      const def = makeValidDefinition();
      def.name = '';
      const result = service.validate(def);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRUCT_001')).toBe(true);
    });

    it('errors when no start event', () => {
      const def = makeValidDefinition();
      def.startEvents = [];
      const result = service.validate(def);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRUCT_002')).toBe(true);
    });

    it('errors when no end event', () => {
      const def = makeValidDefinition();
      def.endEvents = [];
      const result = service.validate(def);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRUCT_003')).toBe(true);
    });

    it('warns when no tasks defined', () => {
      const def = makeValidDefinition();
      def.tasks = [];
      def.flows = [];
      const result = service.validate(def);
      expect(result.warnings.some(w => w.code === 'STRUCT_W001')).toBe(true);
    });

    it('errors on duplicate task IDs', () => {
      const def = makeValidDefinition();
      def.tasks = [
        { id: 'task1', name: 'Task A', type: 'serviceTask', chainEventName: 'evA' },
        { id: 'task1', name: 'Task B', type: 'serviceTask', chainEventName: 'evB' },
      ];
      const result = service.validate(def);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRUCT_004' && e.taskId === 'task1')).toBe(true);
    });
  });

  describe('validate - type constraint warnings', () => {
    it('warns when inputType is not registered', () => {
      typeRegistry = makeTypeRegistry(false);
      service = new BpmnValidatorService(typeRegistry);
      const def = makeValidDefinition();
      def.tasks[0].inputType = 'UnknownInput';
      const result = service.validate(def);
      expect(result.warnings.some(w => w.code === 'TYPE_W001' && w.taskId === 'task1')).toBe(true);
    });

    it('warns when outputType is not registered', () => {
      typeRegistry = makeTypeRegistry(false);
      service = new BpmnValidatorService(typeRegistry);
      const def = makeValidDefinition();
      def.tasks[0].outputType = 'UnknownOutput';
      const result = service.validate(def);
      expect(result.warnings.some(w => w.code === 'TYPE_W002' && w.taskId === 'task1')).toBe(true);
    });

    it('does not warn when inputType is registered', () => {
      typeRegistry = makeTypeRegistry(true);
      service = new BpmnValidatorService(typeRegistry);
      const def = makeValidDefinition();
      def.tasks[0].inputType = 'KnownType';
      const result = service.validate(def);
      expect(result.warnings.some(w => w.code === 'TYPE_W001')).toBe(false);
    });

    it('does not warn when inputType is absent', () => {
      const def = makeValidDefinition();
      // no inputType set
      const result = service.validate(def);
      expect(result.warnings.some(w => w.code === 'TYPE_W001')).toBe(false);
    });
  });

  describe('validate - flow errors', () => {
    it('errors when flow sourceRef does not exist', () => {
      const def = makeValidDefinition();
      def.flows.push({ id: 'flow3', sourceRef: 'nonexistent', targetRef: 'end1' });
      const result = service.validate(def);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FLOW_001')).toBe(true);
    });

    it('errors when flow targetRef does not exist', () => {
      const def = makeValidDefinition();
      def.flows.push({ id: 'flow4', sourceRef: 'start1', targetRef: 'nonexistent' });
      const result = service.validate(def);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FLOW_002')).toBe(true);
    });

    it('does not error when all flows reference valid elements', () => {
      const def = makeValidDefinition();
      const result = service.validate(def);
      expect(result.errors.filter(e => e.code === 'FLOW_001' || e.code === 'FLOW_002')).toHaveLength(0);
    });
  });

  describe('validateOrThrow', () => {
    it('does not throw for valid definition', () => {
      expect(() => service.validateOrThrow(makeValidDefinition())).not.toThrow();
    });

    it('throws BpmnValidationError for invalid definition', () => {
      const def = makeValidDefinition();
      def.startEvents = [];
      expect(() => service.validateOrThrow(def)).toThrow(BpmnValidationError);
    });

    it('thrown error contains the validation errors', () => {
      const def = makeValidDefinition();
      def.startEvents = [];
      def.endEvents = [];
      try {
        service.validateOrThrow(def);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BpmnValidationError);
        const validationErr = err as BpmnValidationError;
        expect(validationErr.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
