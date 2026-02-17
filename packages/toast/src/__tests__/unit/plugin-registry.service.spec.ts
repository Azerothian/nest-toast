import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { Plugin } from '../../decorators/plugin.decorator';
import { OnChainEvent } from '../../decorators/on-chain-event.decorator';

// --- Test interfaces for typed handlers ---

interface OrderData {
  id: string;
  items: string[];
}

interface ProcessedOrder extends OrderData {
  processed: boolean;
}

interface ValidatedOrder extends OrderData {
  validated: boolean;
  validatedBy: string;
}

// --- Test plugin classes ---

@Plugin({ name: 'base', version: '1.0.0' })
class BasePlugin {}

@Plugin({ name: 'dependent', version: '1.0.0', dependencies: ['base'] })
class DependentPlugin {}

@Plugin({ name: 'plugin-a', version: '1.0.0', incompatibleWith: ['plugin-b'] })
class PluginA {}

@Plugin({ name: 'plugin-b', version: '1.0.0' })
class PluginB {}

@Plugin({ name: 'handler-plugin', version: '1.0.0' })
class HandlerPlugin {
  @OnChainEvent<unknown>('order:process')
  handleOrder(data: unknown) { return data; }

  @OnChainEvent<unknown>('order:**')
  handleAllOrders(data: unknown) { return data; }
}

// --- Typed handler plugin classes ---

@Plugin({ name: 'typed-handler-plugin', version: '1.0.0' })
class TypedHandlerPlugin {
  @OnChainEvent<OrderData>('order:validate')
  validateOrder(order: OrderData): Promise<OrderData> {
    return Promise.resolve(order);
  }

  @OnChainEvent<OrderData, ProcessedOrder>('order:process')
  processOrder(order: OrderData): Promise<ProcessedOrder> {
    return Promise.resolve({ ...order, processed: true });
  }

  @OnChainEvent<OrderData, ValidatedOrder>('order:validate-with-user')
  validateOrderWithUser(order: OrderData): Promise<ValidatedOrder> {
    return Promise.resolve({ ...order, validated: true, validatedBy: 'system' });
  }
}

// --- Pre-constrained decorator factory test ---

const OnOrderProcess = (eventName: string) =>
  OnChainEvent<OrderData, ProcessedOrder>(eventName);

const OnOrderValidate = (eventName: string) =>
  OnChainEvent<OrderData, ValidatedOrder>(eventName);

@Plugin({ name: 'factory-handler-plugin', version: '1.0.0' })
class FactoryHandlerPlugin {
  @OnOrderProcess('order:factory-process')
  processOrder(order: OrderData): Promise<ProcessedOrder> {
    return Promise.resolve({ ...order, processed: true });
  }

  @OnOrderValidate('order:factory-validate')
  validateOrder(order: OrderData): Promise<ValidatedOrder> {
    return Promise.resolve({ ...order, validated: true, validatedBy: 'factory' });
  }
}

// Helper to build a mock DiscoveryService from instances
function mockDiscovery(instances: object[]) {
  return {
    getProviders: () => instances.map(instance => ({ instance })),
  };
}

describe('PluginRegistryService', () => {
  let service: PluginRegistryService;

  describe('basic discovery', () => {
    beforeEach(async () => {
      service = new PluginRegistryService(
        mockDiscovery([new BasePlugin(), new DependentPlugin()]) as never,
        {},
      );
      await service.onModuleInit();
    });

    it('should discover plugins', () => {
      expect(service.hasPlugin('base')).toBe(true);
      expect(service.hasPlugin('dependent')).toBe(true);
    });

    it('should return false for unknown plugin', () => {
      expect(service.hasPlugin('unknown')).toBe(false);
    });

    it('should return plugin instance via getPlugin()', () => {
      const instance = service.getPlugin<BasePlugin>('base');
      expect(instance).toBeInstanceOf(BasePlugin);
    });

    it('should throw when getting unknown plugin', () => {
      expect(() => service.getPlugin('missing')).toThrow('not found');
    });

    it('should return plugin metadata', () => {
      const meta = service.getPluginMetadata('base');
      expect(meta).toEqual({ name: 'base', version: '1.0.0' });
    });

    it('should return undefined metadata for unknown plugin', () => {
      expect(service.getPluginMetadata('unknown')).toBeUndefined();
    });

    it('should return all plugins', () => {
      const all = service.getAllPlugins();
      expect(all).toHaveLength(2);
    });

    it('should return a copy of all plugins', () => {
      const all1 = service.getAllPlugins();
      const all2 = service.getAllPlugins();
      expect(all1).not.toBe(all2);
    });
  });

  describe('initialization order', () => {
    beforeEach(async () => {
      service = new PluginRegistryService(
        mockDiscovery([new DependentPlugin(), new BasePlugin()]) as never,
        {},
      );
      await service.onModuleInit();
    });

    it('should resolve base before dependent', () => {
      const order = service.getInitializationOrder();
      expect(order.indexOf('base')).toBeLessThan(order.indexOf('dependent'));
    });

    it('should return a copy of the init order', () => {
      const order1 = service.getInitializationOrder();
      const order2 = service.getInitializationOrder();
      expect(order1).not.toBe(order2);
    });
  });

  describe('dependency validation', () => {
    it('should throw on missing required dependency', async () => {
      @Plugin({ name: 'orphan', version: '1.0.0', dependencies: ['missing-dep'] })
      class OrphanPlugin {}

      service = new PluginRegistryService(
        mockDiscovery([new OrphanPlugin()]) as never,
        {},
      );
      await expect(service.onModuleInit()).rejects.toThrow('missing-dep');
    });

    it('should not throw on missing optional dependency', async () => {
      @Plugin({ name: 'opt', version: '1.0.0', optionalDependencies: ['missing-opt'] })
      class OptPlugin {}

      service = new PluginRegistryService(
        mockDiscovery([new OptPlugin()]) as never,
        {},
      );
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should throw DependencyCycleError on circular dependencies', async () => {
      @Plugin({ name: 'cycleA', version: '1.0.0', dependencies: ['cycleB'] })
      class CycleA {}

      @Plugin({ name: 'cycleB', version: '1.0.0', dependencies: ['cycleA'] })
      class CycleB {}

      service = new PluginRegistryService(
        mockDiscovery([new CycleA(), new CycleB()]) as never,
        {},
      );
      await expect(service.onModuleInit()).rejects.toThrow('Circular dependency');
    });
  });

  describe('compatibility validation', () => {
    it('should throw when incompatible plugins coexist', async () => {
      service = new PluginRegistryService(
        mockDiscovery([new PluginA(), new PluginB()]) as never,
        { validateCompatibility: true },
      );
      await expect(service.onModuleInit()).rejects.toThrow(/incompatible/i);
    });

    it('should not throw for incompatible check when not configured', async () => {
      service = new PluginRegistryService(
        mockDiscovery([new PluginA(), new PluginB()]) as never,
        {},
      );
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('event handler discovery', () => {
    beforeEach(async () => {
      service = new PluginRegistryService(
        mockDiscovery([new HandlerPlugin()]) as never,
        {},
      );
      await service.onModuleInit();
    });

    it('should find handlers for exact event name', () => {
      const handlers = service.getHandlersForEvent('order:process');
      expect(handlers).toHaveLength(2); // exact + glob match
    });

    it('should match glob patterns', () => {
      const handlers = service.getHandlersForEvent('order:anything');
      expect(handlers.length).toBeGreaterThan(0);
    });

    it('should not match unrelated events', () => {
      const handlers = service.getHandlersForEvent('payment:process');
      expect(handlers).toHaveLength(0);
    });
  });

  describe('discoveryFilter', () => {
    it('should filter plugins based on filter function', async () => {
      service = new PluginRegistryService(
        mockDiscovery([new BasePlugin(), new DependentPlugin()]) as never,
        { discoveryFilter: (meta) => meta.name === 'base' },
      );
      await service.onModuleInit();
      expect(service.hasPlugin('base')).toBe(true);
      expect(service.hasPlugin('dependent')).toBe(false);
    });
  });

  describe('typed event handlers', () => {
    beforeEach(async () => {
      service = new PluginRegistryService(
        mockDiscovery([new TypedHandlerPlugin()]) as never,
        {},
      );
      await service.onModuleInit();
    });

    it('should discover typed handlers', () => {
      const handlers = service.getHandlersForEvent('order:validate');
      expect(handlers).toHaveLength(1);
    });

    it('should discover handlers with different input/output types', () => {
      const handlers = service.getHandlersForEvent('order:process');
      expect(handlers).toHaveLength(1);
    });

    it('should discover handlers with transformed output types', () => {
      const handlers = service.getHandlersForEvent('order:validate-with-user');
      expect(handlers).toHaveLength(1);
    });
  });

  describe('factory-based typed handlers', () => {
    beforeEach(async () => {
      service = new PluginRegistryService(
        mockDiscovery([new FactoryHandlerPlugin()]) as never,
        {},
      );
      await service.onModuleInit();
    });

    it('should discover handlers using pre-constrained factories', () => {
      const processHandlers = service.getHandlersForEvent('order:factory-process');
      const validateHandlers = service.getHandlersForEvent('order:factory-validate');
      expect(processHandlers).toHaveLength(1);
      expect(validateHandlers).toHaveLength(1);
    });
  });
});
