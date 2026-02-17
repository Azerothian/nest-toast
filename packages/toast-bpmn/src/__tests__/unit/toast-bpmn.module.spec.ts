import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@azerothian/toast', () => ({
  ChainExecutorService: class {},
  PluginRegistryService: class {},
}));

import { DiscoveryModule } from '@nestjs/core';
import { ToastBpmnModule } from '../../toast-bpmn.module';
import { TOAST_BPMN_MODULE_OPTIONS } from '../../constants';
import { BpmnTypeRegistryService } from '../../services/bpmn-type-registry.service';
import { BpmnLoaderService } from '../../services/bpmn-loader.service';
import { BpmnContextService } from '../../services/bpmn-context.service';
import { BpmnValidatorService } from '../../services/bpmn-validator.service';
import { BpmnExecutorService } from '../../services/bpmn-executor.service';

describe('ToastBpmnModule', () => {
  describe('forRoot', () => {
    it('should return a DynamicModule with global: true', () => {
      const mod = ToastBpmnModule.forRoot();
      expect(mod.global).toBe(true);
    });

    it('should import DiscoveryModule', () => {
      const mod = ToastBpmnModule.forRoot();
      expect(mod.imports).toContain(DiscoveryModule);
    });

    it('should provide all 5 services and the options token', () => {
      const mod = ToastBpmnModule.forRoot({ bpmnPath: '/test' });
      const providers = mod.providers as any[];

      // Options provider
      const optionsProvider = providers.find(
        (p: any) => typeof p === 'object' && p.provide === TOAST_BPMN_MODULE_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue).toEqual({ bpmnPath: '/test' });

      // Service providers
      expect(providers).toContain(BpmnTypeRegistryService);
      expect(providers).toContain(BpmnLoaderService);
      expect(providers).toContain(BpmnContextService);
      expect(providers).toContain(BpmnValidatorService);
      expect(providers).toContain(BpmnExecutorService);
    });

    it('should export all 5 services', () => {
      const mod = ToastBpmnModule.forRoot();
      const exports = mod.exports as any[];

      expect(exports).toContain(BpmnTypeRegistryService);
      expect(exports).toContain(BpmnLoaderService);
      expect(exports).toContain(BpmnContextService);
      expect(exports).toContain(BpmnValidatorService);
      expect(exports).toContain(BpmnExecutorService);
    });

    it('should default options to empty object', () => {
      const mod = ToastBpmnModule.forRoot();
      const providers = mod.providers as any[];
      const optionsProvider = providers.find(
        (p: any) => typeof p === 'object' && p.provide === TOAST_BPMN_MODULE_OPTIONS,
      );
      expect(optionsProvider.useValue).toEqual({});
    });
  });

  describe('forFeature', () => {
    it('should return a minimal DynamicModule', () => {
      const mod = ToastBpmnModule.forFeature();
      expect(mod.module).toBe(ToastBpmnModule);
      expect(mod.global).toBeUndefined();
      expect(mod.providers).toBeUndefined();
      expect(mod.exports).toBeUndefined();
    });
  });
});
