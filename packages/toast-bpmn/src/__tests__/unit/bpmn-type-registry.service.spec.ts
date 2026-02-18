import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { BpmnTypeRegistryService } from '../../services/bpmn-type-registry.service';

const mockDiscoveryService = {
  getProviders: () => [],
} as any;

describe('BpmnTypeRegistryService', () => {
  let service: BpmnTypeRegistryService;

  beforeEach(() => {
    service = new BpmnTypeRegistryService(mockDiscoveryService);
  });

  describe('register / getType / hasType / getAllTypes / getSchema', () => {
    it('should register a type and retrieve it', () => {
      service.register('OrderData');
      expect(service.hasType('OrderData')).toBe(true);
      expect(service.getType('OrderData')).toEqual({ name: 'OrderData', schema: undefined });
    });

    it('should register a type with schema', () => {
      const schema = { id: { type: 'string', required: true } };
      service.register('ProductData', schema);
      expect(service.getSchema('ProductData')).toEqual(schema);
    });

    it('should return undefined for unregistered type', () => {
      expect(service.getType('Unknown')).toBeUndefined();
    });

    it('should return false for hasType on unregistered type', () => {
      expect(service.hasType('Unknown')).toBe(false);
    });

    it('should list all registered types', () => {
      service.register('TypeA');
      service.register('TypeB');
      service.register('TypeC');
      const all = service.getAllTypes();
      expect(all).toContain('TypeA');
      expect(all).toContain('TypeB');
      expect(all).toContain('TypeC');
    });

    it('should return undefined schema for type registered without schema', () => {
      service.register('Bare');
      expect(service.getSchema('Bare')).toBeUndefined();
    });

    it('should overwrite an existing registration', () => {
      service.register('DupType', { x: { type: 'string' } });
      service.register('DupType', { y: { type: 'number' } });
      expect(service.getSchema('DupType')).toEqual({ y: { type: 'number' } });
    });
  });

  describe('validate', () => {
    it('should return invalid for unregistered type', () => {
      const result = service.validate('NoSuchType', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Type "NoSuchType" not registered');
    });

    it('should return valid for registered type without schema', () => {
      service.register('AnyShape');
      const result = service.validate('AnyShape', { anything: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when all required properties are present', () => {
      service.register('StrictType', {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
      });
      const result = service.validate('StrictType', { id: '1', name: 'foo' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when required property is missing', () => {
      service.register('StrictType', {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
      });
      const result = service.validate('StrictType', { id: '1' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required property "name" for type "StrictType"');
    });

    it('should not error for optional properties that are absent', () => {
      service.register('OptionalType', {
        id: { type: 'string', required: true },
        desc: { type: 'string' },
      });
      const result = service.validate('OptionalType', { id: '1' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when data is not an object', () => {
      service.register('ObjType', { id: { type: 'string', required: true } });
      const result = service.validate('ObjType', 'a string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Expected object for type "ObjType"');
    });

    it('should return invalid when data is null and schema is present', () => {
      service.register('NullTest', { id: { type: 'string', required: true } });
      const result = service.validate('NullTest', null);
      expect(result.valid).toBe(false);
    });
  });
});
