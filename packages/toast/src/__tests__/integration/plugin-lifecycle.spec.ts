import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ToastModule } from '../../toast.module';
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { Plugin } from '../../decorators/plugin.decorator';

describe('Plugin Lifecycle Integration', () => {
  it('should register a simple plugin', async () => {
    @Plugin({ name: 'simple', version: '1.0.0' })
    @Injectable()
    class SimplePlugin {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [SimplePlugin],
    }).compile();
    await module.init();

    const registry = module.get<PluginRegistryService>(PluginRegistryService);
    expect(registry.hasPlugin('simple')).toBe(true);
    expect(registry.getPlugin<SimplePlugin>('simple')).toBeInstanceOf(SimplePlugin);

    await module.close();
  });

  it('should call onModuleInit lifecycle hook', async () => {
    let initCalled = false;

    @Plugin({ name: 'lifecycle-init', version: '1.0.0' })
    @Injectable()
    class LifecyclePlugin implements OnModuleInit {
      async onModuleInit() {
        initCalled = true;
      }
    }

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [LifecyclePlugin],
    }).compile();

    await module.init();
    expect(initCalled).toBe(true);
    await module.close();
  });

  it('should call onModuleDestroy lifecycle hook', async () => {
    let destroyCalled = false;

    @Plugin({ name: 'lifecycle-destroy', version: '1.0.0' })
    @Injectable()
    class LifecyclePlugin implements OnModuleDestroy {
      async onModuleDestroy() {
        destroyCalled = true;
      }
    }

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [LifecyclePlugin],
    }).compile();

    await module.close();
    expect(destroyCalled).toBe(true);
  });

  it('should retrieve plugin metadata', async () => {
    @Plugin({ name: 'meta-plugin', version: '2.3.4', dependencies: ['other'] })
    @Injectable()
    class MetaPlugin {}

    @Plugin({ name: 'other', version: '1.0.0' })
    @Injectable()
    class OtherPlugin {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [MetaPlugin, OtherPlugin],
    }).compile();
    await module.init();

    const registry = module.get<PluginRegistryService>(PluginRegistryService);
    const meta = registry.getPluginMetadata('meta-plugin');
    expect(meta).toEqual({ name: 'meta-plugin', version: '2.3.4', dependencies: ['other'] });

    await module.close();
  });

  it('should throw on missing required dependency at module init', async () => {
    @Plugin({ name: 'needs-missing', version: '1.0.0', dependencies: ['does-not-exist'] })
    @Injectable()
    class NeedsPlugin {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot()],
      providers: [NeedsPlugin],
    }).compile();
    await expect(module.init()).rejects.toThrow('does-not-exist');
  });

  it('should throw on incompatible plugins when validateCompatibility is true', async () => {
    @Plugin({ name: 'incompat-a', version: '1.0.0', incompatibleWith: ['incompat-b'] })
    @Injectable()
    class IncompatA {}

    @Plugin({ name: 'incompat-b', version: '1.0.0' })
    @Injectable()
    class IncompatB {}

    const module = await Test.createTestingModule({
      imports: [ToastModule.forRoot({ validateCompatibility: true })],
      providers: [IncompatA, IncompatB],
    }).compile();
    await expect(module.init()).rejects.toThrow(/incompatible/i);
  });
});
