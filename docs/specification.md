# nest-toast

A NestJS library for plugin architecture, chain execution, and workflow orchestration.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [Plugin System](#plugin-system)
   - [@Plugin decorator](#plugin-decorator)
   - [PluginRegistryService](#pluginregistryservice)
   - [Lifecycle hooks](#lifecycle-hooks)
   - [Dependency management](#dependency-management)
5. [Chain Execution](#chain-execution)
   - [ChainContextService](#chaincontextservice)
   - [ChainExecutorService](#chainexecutorservice)
   - [Waterfall execution](#waterfall-execution)
   - [Cancellation](#cancellation)
   - [Parallel execution](#parallel-execution)
   - [Race and allSettled](#race-and-allsettled)
   - [Concurrency control](#concurrency-control)
6. [Workflow Orchestration](#workflow-orchestration)
   - [WorkflowExecutorService](#workflowexecutorservice)
   - [Event-driven workflows](#event-driven-workflows)
   - [Pipeline stages](#pipeline-stages)
7. [Configuration](#configuration)
   - [ToastModule.forRoot() options](#toastmoduleforroot-options)
   - [ToastModule.forFeature()](#toastmoduleforfeature)
8. [API Reference](#api-reference)
   - [Decorators](#decorators)
   - [Services](#services)
   - [Interfaces](#interfaces)
9. [Advanced Patterns](#advanced-patterns)
   - [Conditional loading](#conditional-loading)
   - [Compatibility validation](#compatibility-validation)
   - [Dynamic modules](#dynamic-modules)
10. [Integration Examples](#integration-examples)

---

## Installation

```bash
npm install nest-toast
```

### Peer Dependencies

Ensure you have the following peer dependencies installed:

```bash
npm install @nestjs/common @nestjs/core @nestjs/config @nestjs/event-emitter
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^10.0.0 | Core NestJS decorators and utilities |
| `@nestjs/core` | ^10.0.0 | NestJS runtime and dependency injection |
| `@nestjs/config` | ^3.0.0 | Configuration management |
| `@nestjs/event-emitter` | ^2.0.0 | Event-driven architecture support |

---

## Quick Start

### 1. Import ToastModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ToastModule } from 'nest-toast';

@Module({
  imports: [
    ToastModule.forRoot({
      validateCompatibility: true,
      enableDiscovery: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Create a Plugin

```typescript
// plugins/database/database.plugin.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Plugin } from 'nest-toast';
import { ConfigService } from '@nestjs/config';

@Plugin({
  name: 'database',
  version: '1.0.0',
})
@Injectable()
export class DatabasePlugin implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const config = this.configService.get('database');
    this.pool = await createPool(config);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }
}
```

### 3. Register the Plugin

```typescript
// plugins/database/database.module.ts
import { Module } from '@nestjs/common';
import { ToastModule } from 'nest-toast';
import { DatabasePlugin } from './database.plugin';

@Module({
  imports: [ToastModule.forFeature()],
  providers: [DatabasePlugin],
  exports: [DatabasePlugin],
})
export class DatabaseModule {}
```

### 4. Use Chain Execution

```typescript
// services/order.service.ts
import { Injectable } from '@nestjs/common';
import { ChainExecutorService } from 'nest-toast';

@Injectable()
export class OrderService {
  constructor(private readonly chainExecutor: ChainExecutorService) {}

  async processOrder(order: Order): Promise<Order> {
    return this.chainExecutor.waterfall(order, [
      async (o) => this.validateOrder(o),
      async (o) => this.calculateTotals(o),
      async (o) => this.applyDiscounts(o),
      async (o) => this.processPayment(o),
    ]);
  }
}
```

---

## Core Concepts

### Architecture Overview

nest-toast provides three core capabilities:

| Capability | Purpose | Primary Service |
|------------|---------|-----------------|
| **Plugin System** | Modular, discoverable components with metadata | `PluginRegistryService` |
| **Chain Execution** | Sequential and parallel operation execution | `ChainExecutorService` + `ChainContextService` |
| **Workflow Orchestration** | Event-driven, multi-step workflows | `WorkflowExecutorService` |

### Module Structure

```typescript
// Root Module
import { ToastModule } from 'nest-toast';

@Module({
  imports: [
    ToastModule.forRoot({
      validateCompatibility: true,
      enableDiscovery: true,
    }),
  ],
})
export class AppModule {}

// Feature Module
@Module({
  imports: [ToastModule.forFeature()],
  providers: [MyPlugin],
})
export class MyFeatureModule {}
```

### Key Exports

```typescript
// Decorators
@Plugin({ name, version, dependencies?, incompatibleWith? })

// Services
PluginRegistryService    // Discovery, metadata, dependency ordering
ChainContextService      // Async context for chain state (cancellation, results)
ChainExecutorService     // Waterfall/parallel/race execution
WorkflowExecutorService  // Event-driven workflow orchestration

// Interfaces
PluginMetadata
PluginInstance
ChainContext
ChainHandler<T>
WorkflowStep
```

---

## Plugin System

The plugin system enables modular, discoverable components with rich metadata, dependency management, and lifecycle hooks.

### @Plugin Decorator

Mark a class as a discoverable plugin with metadata:

```typescript
import { Plugin } from 'nest-toast';

@Plugin({
  name: 'user-service',
  version: '2.0.0',
  dependencies: ['database', 'auth'],
  optionalDependencies: ['cache'],
  incompatibleWith: ['legacy-user-service'],
})
@Injectable()
export class UserPlugin implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    // Initialization logic
  }
}
```

#### Decorator Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Unique plugin identifier |
| `version` | `string` | Semantic version string |
| `dependencies` | `string[]` | Required plugins that must be loaded first |
| `optionalDependencies` | `string[]` | Optional plugins to load if available |
| `incompatibleWith` | `string[]` | Plugins that cannot coexist with this one |

### PluginRegistryService

The registry provides runtime access to all discovered plugins:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PluginRegistryService, PluginMetadata } from 'nest-toast';

@Injectable()
export class MyService {
  constructor(private readonly pluginRegistry: PluginRegistryService) {}

  async listPlugins(): Promise<void> {
    // Get a specific plugin
    const dbPlugin = this.pluginRegistry.getPlugin<DatabasePlugin>('database');

    // Check if a plugin exists
    if (this.pluginRegistry.hasPlugin('cache')) {
      // Use cache plugin
    }

    // Get all registered plugins
    const allPlugins = this.pluginRegistry.getAllPlugins();

    // Get dependency-ordered initialization sequence
    const initOrder = this.pluginRegistry.getInitializationOrder();

    // Get metadata for a plugin
    const metadata = this.pluginRegistry.getPluginMetadata('user-service');
  }
}
```

#### Registry API

| Method | Returns | Description |
|--------|---------|-------------|
| `getPlugin<T>(name)` | `T \| undefined` | Get plugin instance by name |
| `hasPlugin(name)` | `boolean` | Check if plugin is registered |
| `getAllPlugins()` | `PluginInfo[]` | Get all plugins with metadata |
| `getPluginMetadata(name)` | `PluginMetadata \| undefined` | Get plugin metadata |
| `getInitializationOrder()` | `string[]` | Get topologically sorted plugin names |

### Lifecycle Hooks

Plugins integrate with NestJS lifecycle hooks:

| Hook | When Triggered | Use Case |
|------|----------------|----------|
| Constructor | Dependencies injected | Inject services via constructor |
| `OnModuleInit` | After module initialized | Initialize resources, validate config |
| `OnApplicationBootstrap` | After all modules initialized | Start background tasks, open connections |
| `BeforeApplicationShutdown` | Before connections close | Graceful shutdown preparation |
| `OnModuleDestroy` | When application stops | Clean up resources |

```typescript
import {
  Injectable,
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { Plugin } from 'nest-toast';

@Plugin({ name: 'my-plugin', version: '1.0.0' })
@Injectable()
export class MyPlugin
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy, BeforeApplicationShutdown
{
  constructor(
    private readonly configService: ConfigService,
    private readonly otherPlugin: OtherPlugin,
  ) {}

  async onModuleInit(): Promise<void> {
    // Initialize resources, validate config
  }

  async onApplicationBootstrap(): Promise<void> {
    // Start background tasks, open connections
  }

  async beforeApplicationShutdown(signal?: string): Promise<void> {
    // Graceful shutdown preparation
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up resources
  }
}
```

### Dependency Management

#### Required Dependencies

Specify plugins that must be loaded before this one:

```typescript
@Plugin({
  name: 'auth',
  version: '1.0.0',
  dependencies: ['database', 'config'],
})
@Injectable()
export class AuthPlugin {
  constructor(
    private readonly database: DatabasePlugin,
  ) {}
}
```

#### Optional Dependencies

Specify plugins to use if available:

```typescript
@Plugin({
  name: 'api',
  version: '1.0.0',
  optionalDependencies: ['cache', 'metrics'],
})
@Injectable()
export class ApiPlugin {
  constructor(
    @Optional() private readonly cache?: CachePlugin,
    @Optional() private readonly metrics?: MetricsPlugin,
  ) {}

  async getData(key: string): Promise<Data> {
    // Use cache if available
    if (this.cache) {
      const cached = await this.cache.get(key);
      if (cached) return cached;
    }

    const data = await this.fetchData(key);

    // Track metrics if available
    this.metrics?.increment('api.fetch');

    return data;
  }
}
```

#### Dynamic Provider Selection

Use dynamic modules for alternative implementations:

```typescript
// plugins/auth/auth.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { ToastModule } from 'nest-toast';

@Module({})
export class AuthModule {
  static register(options?: { cacheProvider?: 'redis' | 'memcached' }): DynamicModule {
    const imports = [
      ToastModule.forFeature(),
      ConfigModule,
      DatabaseModule,
    ];

    // Select cache provider dynamically
    const cacheProvider = options?.cacheProvider || process.env.CACHE_PROVIDER;
    if (cacheProvider === 'redis') {
      imports.push(RedisModule);
    } else if (cacheProvider === 'memcached') {
      imports.push(MemcachedModule);
    }

    return {
      module: AuthModule,
      imports,
      providers: [AuthPlugin],
      exports: [AuthPlugin],
    };
  }
}
```

---

## Chain Execution

The chain execution system provides utilities for executing operations in sequence or parallel with full control over execution flow. It uses `AsyncLocalStorage` for context management, allowing any code in the call stack to access chain state without parameter threading.

### ChainContextService

The `ChainContextService` manages chain execution context using Node.js `AsyncLocalStorage`. This allows any service in the call stack to check or set cancellation state without passing context through parameters.

```typescript
import { Injectable } from '@nestjs/common';
import { ChainContextService } from 'nest-toast';

@Injectable()
export class ValidatorService {
  constructor(private readonly chainContext: ChainContextService) {}

  async validate(order: Order): Promise<Order> {
    if (!order.items.length) {
      // Cancel from anywhere in the call stack
      this.chainContext.cancel(new Error('Order has no items'));
      return order;
    }
    return order;
  }
}
```

#### Context API

| Method | Signature | Description |
|--------|-----------|-------------|
| `run` | `<T>(fn: () => Promise<T>): Promise<T>` | Execute function within a new context |
| `cancel` | `(reason?: Error): void` | Mark the current chain as cancelled |
| `isCancelled` | `(): boolean` | Check if the current chain is cancelled |
| `getContext` | `(): ChainContext \| undefined` | Get the current context (if any) |
| `getReason` | `(): Error \| undefined` | Get the cancellation reason |
| `setResult` | `(key: string, value: any): void` | Store an intermediate result |
| `getResult` | `<T>(key: string): T \| undefined` | Retrieve an intermediate result |

### ChainExecutorService

The executor runs handlers within a context managed by `ChainContextService`:

```typescript
import { Injectable } from '@nestjs/common';
import { ChainExecutorService, ChainContextService } from 'nest-toast';

@Injectable()
export class MyService {
  constructor(
    private readonly chainExecutor: ChainExecutorService,
    private readonly chainContext: ChainContextService,
  ) {}
}
```

### Waterfall Execution

Execute handlers in sequence, passing each result to the next:

```typescript
async processData(input: Data): Promise<Data> {
  const result = await this.chainExecutor.waterfall(input, [
    async (data) => {
      // Transform step 1
      return { ...data, validated: true };
    },
    async (data) => {
      // Transform step 2
      return { ...data, enriched: true };
    },
    async (data) => {
      // Transform step 3
      return { ...data, processed: true };
    },
  ]);

  return result;
}
```

### Cancellation

Cancellation uses `AsyncLocalStorage`, so any service in the call stack can cancel - no need to pass context through every function.

#### Cancel from a Nested Service

```typescript
// services/validator.service.ts
@Injectable()
export class ValidatorService {
  constructor(private readonly chainContext: ChainContextService) {}

  async validateOrder(order: Order): Promise<Order> {
    const errors = await this.runValidations(order);

    if (errors.length > 0) {
      // Cancel the chain from deep in the call stack
      this.chainContext.cancel(new ValidationError(errors));
      return order;
    }

    return order;
  }
}

// services/order.service.ts
@Injectable()
export class OrderService {
  constructor(
    private readonly chainExecutor: ChainExecutorService,
    private readonly chainContext: ChainContextService,
    private readonly validator: ValidatorService,
  ) {}

  async processOrder(order: Order): Promise<Order> {
    const result = await this.chainExecutor.waterfall(order, [
      (o) => this.validator.validateOrder(o),  // Can cancel internally
      (o) => this.calculateTotals(o),          // Skipped if cancelled
      (o) => this.processPayment(o),           // Skipped if cancelled
    ]);

    // Check if cancelled after execution
    if (this.chainContext.isCancelled()) {
      throw this.chainContext.getReason();
    }

    return result;
  }
}
```

#### Cancel with Error Handling

```typescript
async processWithErrorHandling(data: Data): Promise<Result> {
  const result = await this.chainExecutor.waterfall(data, [
    async (d) => this.step1(d),
    async (d) => this.step2(d),
    async (d) => this.step3(d),
  ]);

  if (this.chainContext.isCancelled()) {
    const reason = this.chainContext.getReason();
    this.logger.error('Chain cancelled', reason);
    throw reason;
  }

  return result;
}
```

#### Store Intermediate Results

```typescript
async processWithResults(input: Data): Promise<ProcessedData> {
  const result = await this.chainExecutor.waterfall(input, [
    async (data) => {
      const validated = await this.validate(data);
      this.chainContext.setResult('validation', validated);
      return validated;
    },
    async (data) => {
      const enriched = await this.enrich(data);
      this.chainContext.setResult('enrichment', enriched);
      return enriched;
    },
  ]);

  // Access intermediate results
  const validationResult = this.chainContext.getResult('validation');

  return result;
}

### Parallel Execution

Execute all handlers simultaneously:

```typescript
async fetchAllData(userId: string): Promise<UserData[]> {
  const results = await this.chainExecutor.parallel(userId, [
    async (id) => this.fetchProfile(id),
    async (id) => this.fetchOrders(id),
    async (id) => this.fetchPreferences(id),
  ]);

  return results; // [profile, orders, preferences]
}
```

### Race and allSettled

#### Race Execution

Return the first successful result:

```typescript
async fetchFromFastestSource(key: string): Promise<Data> {
  return this.chainExecutor.race(key, [
    async (k) => this.fetchFromCache(k),
    async (k) => this.fetchFromDatabase(k),
    async (k) => this.fetchFromApi(k),
  ]);
}
```

#### All Settled Execution

Execute all and collect results with status:

```typescript
async sendNotifications(userId: string): Promise<void> {
  const results = await this.chainExecutor.allSettled(userId, [
    async (id) => this.sendEmail(id),
    async (id) => this.sendPush(id),
    async (id) => this.sendSms(id),
  ]);

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    this.logger.warn(`${failures.length} notifications failed`);
  }
}
```

### Concurrency Control

Limit the number of concurrent operations:

```typescript
async processItems(items: Item[]): Promise<Result[]> {
  const handlers = items.map(item => async () => this.processItem(item));

  return this.chainExecutor.parallel(null, handlers, {
    concurrency: 5, // Max 5 concurrent operations
  });
}
```

### Pipeline Execution

Execute named stages with timing information:

```typescript
async processOrder(order: Order): Promise<ProcessedOrder> {
  const { output, timing } = await this.chainExecutor.pipeline<Order, ProcessedOrder>(
    order,
    [
      { name: 'validate', handler: async (o) => this.validate(o) },
      { name: 'enrich', handler: async (o) => this.enrich(o) },
      { name: 'calculate', handler: async (o) => this.calculate(o) },
      { name: 'persist', handler: async (o) => this.persist(o) },
    ],
  );

  // Log timing
  for (const [stage, ms] of timing) {
    this.logger.debug(`Stage ${stage} took ${ms}ms`);
  }

  return output;
}
```

---

## Workflow Orchestration

The `WorkflowExecutorService` combines chain execution with event emission for complex, observable workflows.

### WorkflowExecutorService

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowExecutorService } from 'nest-toast';

@Injectable()
export class OrderService {
  constructor(private readonly workflowExecutor: WorkflowExecutorService) {}
}
```

### Event-Driven Workflows

Execute workflows that emit events at each step:

```typescript
async processOrder(order: Order): Promise<Order> {
  return this.workflowExecutor.executeWorkflow('order-processing', order, [
    {
      name: 'validate',
      handler: async (o) => this.validateOrder(o),
      emitEvent: 'order:validated',
    },
    {
      name: 'payment',
      handler: async (o) => this.processPayment(o),
      emitEvent: 'order:paid',
    },
    {
      name: 'fulfill',
      handler: async (o) => this.fulfillOrder(o),
      emitEvent: 'order:fulfilled',
    },
  ]);
}
```

This emits the following events:

| Event | When |
|-------|------|
| `workflow:order-processing:started` | Workflow begins |
| `workflow:order-processing:step:validate:started` | Step begins |
| `order:validated` | Step completes (custom event) |
| `workflow:order-processing:step:validate:completed` | Step completes |
| `workflow:order-processing:completed` | Workflow completes |

### Listening to Workflow Events

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class OrderNotificationService {
  @OnEvent('order:validated')
  async handleOrderValidated(payload: { data: Order }): Promise<void> {
    await this.sendConfirmationEmail(payload.data);
  }

  @OnEvent('order:paid')
  async handleOrderPaid(payload: { data: Order }): Promise<void> {
    await this.sendPaymentReceipt(payload.data);
  }

  @OnEvent('workflow:order-processing:completed')
  async handleOrderCompleted(payload: { data: Order }): Promise<void> {
    await this.notifyWarehouse(payload.data);
  }
}
```

### Pipeline Stages

Define complex multi-stage pipelines:

```typescript
async processDocument(doc: Document): Promise<ProcessedDocument> {
  const { output, timing } = await this.chainExecutor.pipeline<Document, ProcessedDocument>(
    doc,
    [
      { name: 'parse', handler: async (d) => this.parseDocument(d) },
      { name: 'extract', handler: async (d) => this.extractEntities(d) },
      { name: 'classify', handler: async (d) => this.classifyContent(d) },
      { name: 'index', handler: async (d) => this.indexDocument(d) },
    ],
  );

  this.logger.log(`Document processed in ${Array.from(timing.values()).reduce((a, b) => a + b, 0)}ms`);
  return output;
}
```

---

## Configuration

### ToastModule.forRoot() Options

Configure the root module with these options:

```typescript
ToastModule.forRoot({
  validateCompatibility: true,
  enableDiscovery: true,
  discoveryFilter: (metadata) => metadata.version.startsWith('2.'),
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `validateCompatibility` | `boolean` | `true` | Validate plugin compatibility on startup |
| `enableDiscovery` | `boolean` | `true` | Enable automatic plugin discovery |
| `discoveryFilter` | `(metadata: PluginMetadata) => boolean` | `undefined` | Filter which plugins to register |

### ToastModule.forFeature()

Import in feature modules to enable plugin discovery:

```typescript
@Module({
  imports: [ToastModule.forFeature()],
  providers: [MyPlugin],
})
export class MyFeatureModule {}
```

### Environment Configuration

Use `@nestjs/config` for environment-based configuration:

```typescript
// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'app',
}));
```

```typescript
// app.module.ts
import { ConfigModule } from '@nestjs/config';
import { ToastModule } from 'nest-toast';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    ToastModule.forRoot(),
  ],
})
export class AppModule {}
```

```typescript
// Usage in plugins
import { ConfigService } from '@nestjs/config';

@Plugin({ name: 'database', version: '1.0.0' })
@Injectable()
export class DatabasePlugin {
  constructor(private readonly configService: ConfigService) {}

  connect(): void {
    const host = this.configService.get<string>('database.host');
    const port = this.configService.get<number>('database.port');
    const dbConfig = this.configService.get('database');
  }
}
```

---

## API Reference

### Decorators

#### @Plugin(metadata: PluginMetadata)

Marks a class as a discoverable plugin.

```typescript
interface PluginMetadata {
  name: string;
  version: string;
  dependencies?: string[];
  optionalDependencies?: string[];
  incompatibleWith?: string[];
}
```

### Services

#### PluginRegistryService

| Method | Signature | Description |
|--------|-----------|-------------|
| `getPlugin` | `<T>(name: string): T \| undefined` | Get plugin instance by name |
| `hasPlugin` | `(name: string): boolean` | Check if plugin exists |
| `getAllPlugins` | `(): PluginInfo[]` | Get all plugins |
| `getPluginMetadata` | `(name: string): PluginMetadata \| undefined` | Get plugin metadata |
| `getInitializationOrder` | `(): string[]` | Get topologically sorted names |

#### ChainContextService

| Method | Signature | Description |
|--------|-----------|-------------|
| `run` | `<T>(fn: () => Promise<T>): Promise<T>` | Execute within new context |
| `cancel` | `(reason?: Error): void` | Cancel the current chain |
| `isCancelled` | `(): boolean` | Check cancellation status |
| `getContext` | `(): ChainContext \| undefined` | Get current context |
| `getReason` | `(): Error \| undefined` | Get cancellation reason |
| `setResult` | `(key: string, value: any): void` | Store intermediate result |
| `getResult` | `<T>(key: string): T \| undefined` | Retrieve intermediate result |

#### ChainExecutorService

| Method | Signature | Description |
|--------|-----------|-------------|
| `waterfall` | `<T>(initial: T, handlers: ChainHandler<T>[]): Promise<T>` | Sequential execution |
| `parallel` | `<T, R>(input: T, handlers: ((input: T) => Promise<R>)[], options?): Promise<R[]>` | Concurrent execution |
| `race` | `<T, R>(input: T, handlers: ((input: T) => Promise<R>)[]): Promise<R>` | First result wins |
| `allSettled` | `<T, R>(input: T, handlers: ((input: T) => Promise<R>)[]): Promise<PromiseSettledResult<R>[]>` | All results with status |
| `pipeline` | `<TIn, TOut>(input: TIn, stages: PipelineStage[]): Promise<PipelineResult<TOut>>` | Named stages with timing |

#### WorkflowExecutorService

| Method | Signature | Description |
|--------|-----------|-------------|
| `executeWorkflow` | `<T>(name: string, data: T, steps: WorkflowStep<T>[]): Promise<T>` | Event-driven workflow |

### Interfaces

```typescript
// Chain handler function type (no context parameter - use ChainContextService)
type ChainHandler<T> = (input: T) => Promise<T>;

// Chain execution context (managed by AsyncLocalStorage)
interface ChainContext {
  cancelled: boolean;
  reason?: Error;
  results: Map<string, any>;
}

// Pipeline stage definition
interface PipelineStage<T = any> {
  name: string;
  handler: (data: T) => Promise<T>;
}

// Pipeline execution result
interface PipelineResult<T> {
  output: T;
  timing: Map<string, number>;
}

// Workflow step definition
interface WorkflowStep<T> {
  name: string;
  handler: (data: T) => Promise<T>;
  emitEvent?: string;
}

// Plugin information
interface PluginInfo {
  name: string;
  instance: any;
  metadata: PluginMetadata;
}
```

---

## Advanced Patterns

### Conditional Loading

Load plugins based on environment or configuration:

```typescript
// app.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { ToastModule } from 'nest-toast';

@Module({})
export class AppModule {
  static forRoot(): DynamicModule {
    const imports = [
      ConfigModule.forRoot({ isGlobal: true }),
      ToastModule.forRoot(),
      DatabaseModule,
    ];

    // Conditional loading based on environment
    if (process.env.CACHE_ENABLED === 'true') {
      imports.push(CacheModule);
    }

    if (process.env.NODE_ENV === 'development') {
      imports.push(DevToolsModule);
    }

    // Load modules based on feature flags
    const enabledFeatures = (process.env.FEATURES || '').split(',');

    if (enabledFeatures.includes('analytics')) {
      imports.push(AnalyticsModule);
    }

    if (enabledFeatures.includes('notifications')) {
      imports.push(NotificationModule);
    }

    return {
      module: AppModule,
      imports,
    };
  }
}
```

### Compatibility Validation

Validate that incompatible plugins are not loaded together:

```typescript
// The CompatibilityValidatorService runs automatically when
// ToastModule.forRoot({ validateCompatibility: true }) is configured

// Manual validation example
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PluginRegistryService } from 'nest-toast';

@Injectable()
export class CompatibilityValidatorService implements OnModuleInit {
  private readonly logger = new Logger(CompatibilityValidatorService.name);

  constructor(private readonly pluginRegistry: PluginRegistryService) {}

  async onModuleInit(): Promise<void> {
    const plugins = this.pluginRegistry.getAllPlugins();

    for (const plugin of plugins) {
      const incompatible = plugin.metadata.incompatibleWith || [];

      for (const incompatibleName of incompatible) {
        if (this.pluginRegistry.hasPlugin(incompatibleName)) {
          const message = `Plugin "${plugin.name}" is incompatible with "${incompatibleName}". ` +
            `Both cannot be loaded simultaneously.`;
          this.logger.error(message);
          throw new Error(message);
        }
      }
    }

    this.logger.log('All plugin compatibility checks passed');
  }
}
```

### Dynamic Modules

Create modules that configure themselves based on options:

```typescript
import { Module, DynamicModule } from '@nestjs/common';
import { ToastModule } from 'nest-toast';

export interface CacheModuleOptions {
  provider: 'redis' | 'memcached' | 'memory';
  ttl?: number;
}

@Module({})
export class CacheModule {
  static register(options: CacheModuleOptions): DynamicModule {
    const providers = [];

    switch (options.provider) {
      case 'redis':
        providers.push(RedisCachePlugin);
        break;
      case 'memcached':
        providers.push(MemcachedCachePlugin);
        break;
      default:
        providers.push(MemoryCachePlugin);
    }

    providers.push({
      provide: 'CACHE_OPTIONS',
      useValue: options,
    });

    return {
      module: CacheModule,
      imports: [ToastModule.forFeature()],
      providers,
      exports: providers,
    };
  }
}
```

---

## Integration Examples

### Complete Application Setup

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableShutdownHooks();

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });

  await app.listen(process.env.PORT || 3000);
  console.log('Application ready');
}

bootstrap();
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ToastModule } from 'nest-toast';
import { DatabaseModule } from './plugins/database/database.module';
import { AuthModule } from './plugins/auth/auth.module';
import { UserModule } from './features/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ':',
    }),
    ToastModule.forRoot({
      validateCompatibility: true,
      enableDiscovery: true,
    }),
    DatabaseModule,
    AuthModule.register(),
    UserModule,
  ],
})
export class AppModule {}
```

### Event-Driven Architecture

```typescript
// Setting up event emission
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const user = await this.userRepo.create(data);
    this.eventEmitter.emit('user:created', { userId: user.id });
    return user;
  }
}

// Listening to events
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  @OnEvent('user:created')
  async handleUserCreated(payload: { userId: number }): Promise<void> {
    await this.sendWelcomeEmail(payload.userId);
  }

  @OnEvent('user:**') // Wildcard listener
  async handleAllUserEvents(payload: any): Promise<void> {
    await this.logUserEvent(payload);
  }
}
```

### Recommended Directory Structure

```
src/
├── app.module.ts           # Root module
├── main.ts                 # Bootstrap entry point
├── config/                 # Configuration
│   ├── database.config.ts
│   └── app.config.ts
├── plugins/                # Plugin modules
│   ├── database/
│   │   ├── database.module.ts
│   │   └── database.plugin.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   └── auth.plugin.ts
│   └── cache/
│       ├── cache.module.ts
│       └── cache.plugin.ts
├── features/               # Feature modules
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.service.ts
│   │   └── user.controller.ts
│   └── order/
│       ├── order.module.ts
│       ├── order.service.ts
│       └── order.controller.ts
└── shared/                 # Shared utilities
    ├── interceptors/
    ├── pipes/
    └── filters/
```

---

## Summary

nest-toast provides a comprehensive toolkit for building modular NestJS applications:

1. **Plugin System** - `@Plugin()` decorator and `PluginRegistryService` for discoverable, metadata-rich components with dependency management

2. **Chain Execution** - `ChainExecutorService` and `ChainContextService` for waterfall, parallel, race, and pipeline execution patterns with `AsyncLocalStorage`-based cancellation (no context parameter threading)

3. **Workflow Orchestration** - `WorkflowExecutorService` for event-driven, multi-step workflows with automatic event emission

4. **Full NestJS Integration** - Works seamlessly with `@nestjs/config`, `@nestjs/event-emitter`, and NestJS lifecycle hooks
