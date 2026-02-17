import { Module, DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TOAST_BPMN_MODULE_OPTIONS } from './constants';
import { BpmnTypeRegistryService } from './services/bpmn-type-registry.service';
import { BpmnLoaderService } from './services/bpmn-loader.service';
import { BpmnContextService } from './services/bpmn-context.service';
import { BpmnValidatorService } from './services/bpmn-validator.service';
import { BpmnExecutorService } from './services/bpmn-executor.service';
import type { ToastBpmnModuleOptions } from './interfaces/bpmn-module-options.interface';

@Module({})
export class ToastBpmnModule {
  static forRoot(options: ToastBpmnModuleOptions = {}): DynamicModule {
    return {
      module: ToastBpmnModule,
      global: true,
      imports: [DiscoveryModule],
      providers: [
        { provide: TOAST_BPMN_MODULE_OPTIONS, useValue: options },
        BpmnTypeRegistryService,
        BpmnLoaderService,
        BpmnContextService,
        BpmnValidatorService,
        BpmnExecutorService,
      ],
      exports: [
        BpmnTypeRegistryService,
        BpmnLoaderService,
        BpmnContextService,
        BpmnValidatorService,
        BpmnExecutorService,
      ],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: ToastBpmnModule,
    };
  }
}
