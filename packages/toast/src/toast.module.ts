import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PluginRegistryService } from './services/plugin-registry.service';
import { ChainContextService } from './services/chain-context.service';
import { ChainExecutorService } from './services/chain-executor.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { TOAST_MODULE_OPTIONS } from './constants';
import type { ToastModuleOptions } from './interfaces/toast-module-options.interface';

@Module({})
export class ToastModule {
  static forRoot(options: ToastModuleOptions = {}): DynamicModule {
    return {
      module: ToastModule,
      global: true,
      imports: [DiscoveryModule, EventEmitterModule.forRoot()],
      providers: [
        { provide: TOAST_MODULE_OPTIONS, useValue: options },
        PluginRegistryService,
        ChainContextService,
        ChainExecutorService,
        WorkflowExecutorService,
      ],
      exports: [
        PluginRegistryService,
        ChainContextService,
        ChainExecutorService,
        WorkflowExecutorService,
      ],
    };
  }

  static forFeature(): DynamicModule {
    return { module: ToastModule };
  }
}
