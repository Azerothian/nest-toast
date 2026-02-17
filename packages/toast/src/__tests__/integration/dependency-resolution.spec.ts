import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { ToastModule } from '../../toast.module';
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { Plugin } from '../../decorators/plugin.decorator';

describe('Dependency Resolution Integration', () => {
  it('should resolve base before dependent', async () => {
    @Plugin({ name: 'dr-base', version: '1.0.0' })
    @Injectable()
    class DrBasePlugin {}

    @Plugin({ name: 'dr-dependent', version: '1.0.0', dependencies: ['dr-base'] })
    @Injectable()
    class DrDependentPlugin {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [DrDependentPlugin, DrBasePlugin],
    }).compile();
    await module.init();

    const registry = module.get<PluginRegistryService>(PluginRegistryService);
    const order = registry.getInitializationOrder();
    expect(order.indexOf('dr-base')).toBeLessThan(order.indexOf('dr-dependent'));

    await module.close();
  });

  it('should resolve complex 5-plugin dependency graph', async () => {
    @Plugin({ name: 'config', version: '1.0.0' })
    @Injectable()
    class ConfigPlugin {}

    @Plugin({ name: 'logger', version: '1.0.0', dependencies: ['config'] })
    @Injectable()
    class LoggerPlugin {}

    @Plugin({ name: 'database', version: '1.0.0', dependencies: ['config', 'logger'] })
    @Injectable()
    class DatabasePlugin {}

    @Plugin({ name: 'cache', version: '1.0.0', dependencies: ['config'] })
    @Injectable()
    class CachePlugin {}

    @Plugin({ name: 'auth', version: '1.0.0', dependencies: ['database', 'cache'] })
    @Injectable()
    class AuthPlugin {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [AuthPlugin, DatabasePlugin, CachePlugin, LoggerPlugin, ConfigPlugin],
    }).compile();
    await module.init();

    const registry = module.get<PluginRegistryService>(PluginRegistryService);
    const order = registry.getInitializationOrder();

    expect(order[0]).toBe('config');
    expect(order[order.length - 1]).toBe('auth');
    expect(order.indexOf('config')).toBeLessThan(order.indexOf('logger'));
    expect(order.indexOf('config')).toBeLessThan(order.indexOf('database'));
    expect(order.indexOf('logger')).toBeLessThan(order.indexOf('database'));
    expect(order.indexOf('database')).toBeLessThan(order.indexOf('auth'));
    expect(order.indexOf('cache')).toBeLessThan(order.indexOf('auth'));

    await module.close();
  });

  it('should throw on circular dependencies at module init', async () => {
    @Plugin({ name: 'cycle-x', version: '1.0.0', dependencies: ['cycle-y'] })
    @Injectable()
    class CycleX {}

    @Plugin({ name: 'cycle-y', version: '1.0.0', dependencies: ['cycle-z'] })
    @Injectable()
    class CycleY {}

    @Plugin({ name: 'cycle-z', version: '1.0.0', dependencies: ['cycle-x'] })
    @Injectable()
    class CycleZ {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [CycleX, CycleY, CycleZ],
    }).compile();
    await expect(module.init()).rejects.toThrow('Circular dependency');
  });

  it('should allow optional dependencies that are missing', async () => {
    @Plugin({ name: 'optional-owner', version: '1.0.0', optionalDependencies: ['not-there'] })
    @Injectable()
    class OptionalOwner {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [OptionalOwner],
    }).compile();
    await module.init();

    const registry = module.get<PluginRegistryService>(PluginRegistryService);
    expect(registry.hasPlugin('optional-owner')).toBe(true);

    await module.close();
  });
});
