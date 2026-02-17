import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { Plugin } from '../decorators/plugin.decorator';

export interface TestPluginOptions {
  name: string;
  version?: string;
  dependencies?: string[];
  optionalDependencies?: string[];
  incompatibleWith?: string[];
}

export function createTestPlugin(options: TestPluginOptions) {
  @Plugin({
    name: options.name,
    version: options.version ?? '1.0.0',
    dependencies: options.dependencies,
    optionalDependencies: options.optionalDependencies,
    incompatibleWith: options.incompatibleWith,
  })
  @Injectable()
  class TestPlugin {
    public initialized = false;
    public bootstrapped = false;

    async onModuleInit() {
      this.initialized = true;
    }

    async onApplicationBootstrap() {
      this.bootstrapped = true;
    }
  }

  return TestPlugin;
}
