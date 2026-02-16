# @azerothian/nestjs-chained

A NestJS library for plugin architecture, chain execution, and workflow orchestration.

## Table of Contents

1. [Installation](#installation)
2. [Development](#development)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Plugin System](#plugin-system)
   - [@Plugin decorator](#plugin-decorator)
   - [PluginRegistryService](#pluginregistryservice)
   - [Lifecycle hooks](#lifecycle-hooks)
   - [Dependency management](#dependency-management)
   - [Dependency resolution and topological sorting](#dependency-resolution-and-topological-sorting)
6. [Chain Execution](#chain-execution)
   - [ChainContextService](#chaincontextservice)
   - [ChainExecutorService](#chainexecutorservice)
   - [Waterfall execution](#waterfall-execution)
   - [Cancellation](#cancellation)
   - [Parallel execution](#parallel-execution)
   - [Race and allSettled](#race-and-allsettled)
   - [Concurrency control](#concurrency-control)
7. [Workflow Orchestration](#workflow-orchestration)
   - [WorkflowExecutorService](#workflowexecutorservice)
   - [Event-driven workflows](#event-driven-workflows)
   - [Working with ChainEvent](#working-with-chainevent)
   - [Pipeline stages](#pipeline-stages)
8. [Configuration](#configuration)
   - [ToastModule.forRoot() options](#toastmoduleforroot-options)
   - [ToastModule.forFeature()](#toastmoduleforfeature)
9. [API Reference](#api-reference)
   - [Decorators](#decorators)
   - [Services](#services)
   - [Interfaces](#interfaces)
10. [Advanced Patterns](#advanced-patterns)
   - [Conditional loading](#conditional-loading)
   - [Compatibility validation](#compatibility-validation)
   - [Dynamic modules](#dynamic-modules)
11. [Integration Examples](#integration-examples)

---

## Installation

```bash
npm install @azerothian/nestjs-chained
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

## Development

@azerothian/nestjs-chained is developed using TypeScript and Turborepo for monorepo management, enabling modular architecture and efficient build orchestration.

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe development with full IDE support |
| **Turborepo** | Monorepo build system with intelligent caching |
| **NestJS** | Application framework and dependency injection |
| **Jest** | Unit and integration testing |
| **ESLint** | Code quality and style enforcement |

### Monorepo Structure

```
nestjs-chained/
├── packages/
│   ├── core/           # Core library with plugin system
│   │   ├── src/
│   │   │   ├── decorators/
│   │   │   ├── services/
│   │   │   └── interfaces/
│   │   └── package.json
│   ├── chain/          # Chain execution utilities
│   │   ├── src/
│   │   │   ├── chain-context.service.ts
│   │   │   └── chain-executor.service.ts
│   │   └── package.json
│   └── workflow/       # Workflow orchestration
│       ├── src/
│       │   └── workflow-executor.service.ts
│       └── package.json
├── apps/
│   └── examples/       # Example applications
│       ├── basic/
│       ├── advanced/
│       └── production/
├── turbo.json          # Turborepo configuration
└── package.json        # Workspace root
```

### Build Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build specific package
npm run build --filter=@azerothian/nestjs-chained-core

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Type check
npm run type-check
```

### Development Workflow

1. **Package Development**: Work in individual packages under `packages/`
2. **Internal Dependencies**: Packages can depend on each other via workspace protocol
3. **Incremental Builds**: Turborepo caches build outputs for unchanged packages
4. **Parallel Execution**: Tests and builds run in parallel across packages
5. **Type Safety**: Shared TypeScript types ensure consistency across packages

### Turborepo Configuration

The `turbo.json` file defines the build pipeline:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

---

## Quick Start

### 1. Import ToastModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ToastModule } from '@azerothian/nestjs-chained';

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
import { Plugin } from '@azerothian/nestjs-chained';
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
import { ToastModule } from '@azerothian/nestjs-chained';
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
import { ChainExecutorService } from '@azerothian/nestjs-chained';

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

@azerothian/nestjs-chained provides three core capabilities:

| Capability | Purpose | Primary Service |
|------------|---------|-----------------|
| **Plugin System** | Modular, discoverable components with metadata | `PluginRegistryService` |
| **Chain Execution** | Sequential and parallel operation execution | `ChainExecutorService` + `ChainContextService` |
| **Workflow Orchestration** | Event-driven, multi-step workflows | `WorkflowExecutorService` |

### Module Structure

```typescript
// Root Module
import { ToastModule } from '@azerothian/nestjs-chained';

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
@OnChainEvent(eventName)

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
ChainEvent<T>
WorkflowStep
```

---

## Plugin System

The plugin system enables modular, discoverable components with rich metadata, dependency management, and lifecycle hooks.

### @Plugin Decorator

Mark a class as a discoverable plugin with metadata:

```typescript
import { Plugin } from '@azerothian/nestjs-chained';

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
import { PluginRegistryService, PluginMetadata } from '@azerothian/nestjs-chained';

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
import { Plugin } from '@azerothian/nestjs-chained';

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
import { ToastModule } from '@azerothian/nestjs-chained';

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

#### Dependency Resolution and Topological Sorting

@azerothian/nestjs-chained uses **topological sorting** with **Kahn's algorithm** to determine the correct order for plugin initialization and @OnChainEvent handler execution. This ensures dependencies are always initialized/executed before their dependents.

**Why Topological Sorting?**

When you have plugins with dependencies like this:
- Plugin A depends on nothing
- Plugin B depends on A
- Plugin C depends on A and B
- Plugin D depends on C

The system must determine the correct initialization order: `A → B → C → D`

**Algorithm: Kahn's Algorithm (BFS-based)**

```typescript
class DependencyGraph {
  private adjacencyList: Map<string, string[]>;

  constructor() {
    this.adjacencyList = new Map<string, string[]>();
  }

  addVertex(vertex: string): void {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }

  addEdge(from: string, to: string): void {
    if (this.adjacencyList.has(from)) {
      this.adjacencyList.get(from)?.push(to);
    } else {
      throw new Error(`Vertex ${from} does not exist in the graph.`);
    }
  }

  topologicalSort(): string[] {
    const indegree: Map<string, number> = new Map();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate indegree for each vertex
    for (const [vertex, neighbors] of this.adjacencyList) {
      indegree.set(vertex, indegree.get(vertex) || 0);
      for (const neighbor of neighbors) {
        indegree.set(neighbor, (indegree.get(neighbor) || 0) + 1);
      }
    }

    // Initialize queue with vertices having indegree of 0
    for (const vertex of indegree.keys()) {
      if (indegree.get(vertex) === 0) {
        queue.push(vertex);
      }
    }

    // Topological sort using Kahn's algorithm
    while (queue.length > 0) {
      const vertex = queue.shift()!;
      result.push(vertex);

      const neighbors = this.adjacencyList.get(vertex) || [];
      for (const neighbor of neighbors) {
        indegree.set(neighbor, indegree.get(neighbor)! - 1);
        if (indegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Cycle detection
    if (result.length !== this.adjacencyList.size) {
      const missingVertices = Array.from(this.adjacencyList.keys())
        .filter((vertex) => !result.includes(vertex));

      throw new DependencyCycleError({
        message: 'Circular dependency detected',
        result,
        adjacencyList: this.adjacencyList,
        missingVertices,
      });
    }

    return result;
  }
}
```

**How It Works:**

1. **Build Adjacency List**: Create a graph where each plugin points to its dependencies
2. **Calculate Indegree**: Count how many plugins depend on each plugin
3. **Initialize Queue**: Start with plugins that have no dependencies (indegree = 0)
4. **Process Queue**:
   - Remove a plugin from the queue
   - Add it to the result (this is the next plugin to initialize)
   - Decrease indegree of its dependents
   - Add dependents with indegree 0 to the queue
5. **Cycle Detection**: If not all plugins are in the result, there's a circular dependency

**Plugin Initialization Order**

The `PluginRegistryService.getInitializationOrder()` method uses topological sort to determine initialization order:

```typescript
// Example plugin dependencies
@Plugin({ name: 'config', version: '1.0.0' })
export class ConfigPlugin {}

@Plugin({ name: 'database', version: '1.0.0', dependencies: ['config'] })
export class DatabasePlugin {}

@Plugin({ name: 'auth', version: '1.0.0', dependencies: ['database', 'config'] })
export class AuthPlugin {}

@Plugin({ name: 'api', version: '1.0.0', dependencies: ['auth'] })
export class ApiPlugin {}

// Graph representation:
// config → database → auth → api
//   ↓                   ↑
//   └───────────────────┘

// Topological sort result:
// ['config', 'database', 'auth', 'api']
```

**@OnChainEvent Execution Order**

When multiple plugins register handlers for the same ChainEvent, they execute in dependency order:

```typescript
@Plugin({ name: 'logger', version: '1.0.0' })
export class LoggerPlugin {
  @OnChainEvent('order:created')
  async handleOrderCreated(order: Order): Promise<Order> {
    console.log('Logger: order created');
    return { ...order, logged: true };
  }
}

@Plugin({ name: 'validator', version: '1.0.0', dependencies: ['logger'] })
export class ValidatorPlugin {
  @OnChainEvent('order:created')
  async handleOrderCreated(order: Order): Promise<Order> {
    // Executes AFTER logger (receives { ...order, logged: true })
    console.log('Validator: validating order');
    return { ...order, validated: true };
  }
}

@Plugin({ name: 'payment', version: '1.0.0', dependencies: ['validator'] })
export class PaymentPlugin {
  @OnChainEvent('order:created')
  async handleOrderCreated(order: Order): Promise<Order> {
    // Executes AFTER validator (receives { ...order, logged: true, validated: true })
    console.log('Payment: processing payment');
    return { ...order, paid: true };
  }
}

// Execution order: logger → validator → payment
// Final result: { ...order, logged: true, validated: true, paid: true }
```

**Cycle Detection**

Circular dependencies are detected and reported with detailed error information:

```typescript
// BAD: Circular dependency
@Plugin({ name: 'A', version: '1.0.0', dependencies: ['B'] })
export class PluginA {}

@Plugin({ name: 'B', version: '1.0.0', dependencies: ['C'] })
export class PluginB {}

@Plugin({ name: 'C', version: '1.0.0', dependencies: ['A'] })  // Cycle!
export class PluginC {}

// Error thrown during initialization:
// DependencyCycleError: Circular dependency detected
// Missing vertices: ['A', 'B', 'C']
// Result: []
// Adjacency list: { A: ['B'], B: ['C'], C: ['A'] }
```

**Error Handling**

```typescript
export interface DependencyCycleErrorOpts {
  message: string;
  result: string[];
  adjacencyList: Map<string, string[]>;
  missingVertices: string[];
}

export class DependencyCycleError extends Error {
  result: string[];
  adjacencyList: Map<string, string[]>;
  missingVertices: string[];

  constructor(opts: DependencyCycleErrorOpts) {
    super(opts.message);
    this.name = 'DependencyCycleError';
    this.result = opts.result;
    this.adjacencyList = opts.adjacencyList;
    this.missingVertices = opts.missingVertices;
  }
}
```

**Complex Dependency Graph Example**

```typescript
// Real-world example with multiple dependency paths
@Plugin({ name: 'config', version: '1.0.0' })
export class ConfigPlugin {}

@Plugin({ name: 'logger', version: '1.0.0', dependencies: ['config'] })
export class LoggerPlugin {}

@Plugin({ name: 'database', version: '1.0.0', dependencies: ['config', 'logger'] })
export class DatabasePlugin {}

@Plugin({ name: 'cache', version: '1.0.0', dependencies: ['config'] })
export class CachePlugin {}

@Plugin({ name: 'auth', version: '1.0.0', dependencies: ['database', 'cache'] })
export class AuthPlugin {}

@Plugin({ name: 'api', version: '1.0.0', dependencies: ['auth', 'logger'] })
export class ApiPlugin {}

// Dependency graph:
//              config
//             /  |  \
//           /    |    \
//      logger  cache  (direct to database)
//         |      |      |
//         |      |   database
//         |      |   /
//         |    auth
//         |   /
//        api

// Valid topological sort (one possible order):
// ['config', 'logger', 'cache', 'database', 'auth', 'api']

// Or alternatively:
// ['config', 'cache', 'logger', 'database', 'auth', 'api']

// Both are valid - the algorithm guarantees dependencies come before dependents
```

**Best Practices**

1. **Avoid Circular Dependencies**: Design plugins to have clear dependency hierarchies
2. **Use Optional Dependencies**: When a dependency is not critical, mark it as optional
3. **Keep Dependency Chains Short**: Deep dependency chains can make debugging difficult
4. **Group Related Plugins**: Plugins that work together should have consistent naming
5. **Document Dependencies**: Comment why each dependency is needed

**Performance Considerations**

- **Time Complexity**: O(V + E) where V = vertices (plugins), E = edges (dependencies)
- **Space Complexity**: O(V + E) for adjacency list storage
- **Initialization**: Topological sort runs once during application startup
- **Event Execution**: Handler order is cached, no runtime sorting needed

---

## Chain Execution

The chain execution system provides utilities for executing operations in sequence or parallel with full control over execution flow.

**Key Innovation: AsyncLocalStorage for Context Management**

Unlike traditional approaches that require passing context objects through every function parameter, @azerothian/nestjs-chained uses Node.js `AsyncLocalStorage` to maintain chain state (cancellation, intermediate results) accessible from anywhere in the call stack. This means:

- ✅ **No parameter threading**: Services deep in your call stack can cancel or check status
- ✅ **Cleaner interfaces**: Handler functions only receive and return data
- ✅ **Flexible architecture**: Add cancellation to existing code without refactoring signatures
- ✅ **Framework integration**: Works seamlessly with dependency injection and decorators

### ChainContextService

The `ChainContextService` manages chain execution context using Node.js `AsyncLocalStorage`. This allows any service in the call stack to check or set cancellation state without passing context through parameters.

#### Why AsyncLocalStorage?

**❌ Traditional Pattern (Context Threading)**
```typescript
// Every function must accept and pass context
interface Context {
  cancelled: boolean;
  reason?: Error;
}

async function processOrder(order: Order, context: Context): Promise<Order> {
  const validated = await validateOrder(order, context);
  if (context.cancelled) return validated;

  const calculated = await calculateTotals(validated, context);
  if (context.cancelled) return calculated;

  return processPayment(calculated, context);
}

async function validateOrder(order: Order, context: Context): Promise<Order> {
  // Must pass context to nested calls
  const result = await deepValidation(order, context);
  return result;
}

async function deepValidation(order: Order, context: Context): Promise<Order> {
  if (!order.items.length) {
    context.cancelled = true;  // Mutate shared context
    context.reason = new Error('No items');
  }
  return order;
}
```

**✅ @azerothian/nestjs-chained Pattern (AsyncLocalStorage)**
```typescript
// Clean interfaces - no context parameter needed
async function processOrder(order: Order): Promise<Order> {
  return chainExecutor.waterfall(order, [
    (o) => validateOrder(o),
    (o) => calculateTotals(o),
    (o) => processPayment(o),
  ]);
}

@Injectable()
export class ValidatorService {
  constructor(private readonly chainContext: ChainContextService) {}

  async validateOrder(order: Order): Promise<Order> {
    // Inject ChainContextService anywhere in the call stack
    const result = await this.deepValidation(order);
    return result;
  }

  private async deepValidation(order: Order): Promise<Order> {
    if (!order.items.length) {
      // Cancel from any depth - no parameter threading required
      this.chainContext.cancel(new Error('No items'));
    }
    return order;
  }
}
```

#### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { ChainContextService } from '@azerothian/nestjs-chained';

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
import { ChainExecutorService, ChainContextService } from '@azerothian/nestjs-chained';

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

> **💡 AsyncLocalStorage-Powered Cancellation**
>
> Cancellation uses Node.js `AsyncLocalStorage`, enabling any service at any depth in your call stack to cancel chain execution without parameter threading. Simply inject `ChainContextService` and call `cancel()` - no need to modify function signatures or pass context objects through every layer.
>
> **Benefits:**
> - Cancel from deeply nested services without refactoring
> - Maintain clean function signatures focused on business logic
> - Works seamlessly with NestJS dependency injection
> - No performance overhead from parameter passing

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
import { WorkflowExecutorService } from '@azerothian/nestjs-chained';

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

Workflow events come in two types:

1. **Workflow Lifecycle Events** - Standard NestJS events emitted by WorkflowExecutorService
2. **Custom Step Events** - ChainEvents emitted from workflow steps

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OnChainEvent } from '@azerothian/nestjs-chained';

@Injectable()
export class OrderNotificationService {
  // Custom ChainEvents from workflow steps (use @OnChainEvent)
  @OnChainEvent('order:validated')
  async handleOrderValidated(order: Order): Promise<Order> {
    await this.sendConfirmationEmail(order);
    return order;
  }

  @OnChainEvent('order:paid')
  async handleOrderPaid(order: Order): Promise<Order> {
    await this.sendPaymentReceipt(order);
    return order;
  }

  // Workflow lifecycle events (use @OnEvent)
  @OnEvent('workflow:order-processing:completed')
  async handleWorkflowCompleted(payload: { data: Order }): Promise<void> {
    await this.notifyWarehouse(payload.data);
  }

  @OnEvent('workflow:order-processing:started')
  async handleWorkflowStarted(payload: { workflowName: string }): Promise<void> {
    this.logger.log(`Workflow ${payload.workflowName} started`);
  }
}
```

> **Note**: Custom events emitted via `emitEvent` in workflow steps are ChainEvents and should use `@OnChainEvent`. Workflow lifecycle events (started, completed, step:started, step:completed) are standard NestJS events and use `@OnEvent`.

### Working with ChainEvent

The `ChainEvent` interface provides a standardized structure for workflow and chain events, enabling rich metadata, tagging, and distributed tracing.

#### Basic ChainEvent Structure

The `ChainEvent` interface defines the structure used internally by the framework and when emitting events via factory functions:

```typescript
import { ChainEvent } from '@azerothian/nestjs-chained';

const event: ChainEvent<Order> = {
  name: 'order:validated',
  data: order,
  timestamp: Date.now(),
  tags: ['business', 'critical'],
  metadata: {
    validatedBy: 'ValidatorService',
    rulesApplied: ['stock-check', 'price-validation'],
  },
  context: {
    executionId: 'exec-123',
    duration: 45,
  },
};
```

> **Note**: Event handlers decorated with `@OnChainEvent` receive only the `data` field directly (e.g., `Order`), not the full `ChainEvent` wrapper. The metadata, tags, and context can be accessed via `ChainContextService.getCurrentEvent()` when needed.

#### Using ChainEvent with Workflows

You can use ChainEvent in two ways: simple string events or rich ChainEvent factories.

**Simple String Event (Backward Compatible)**
```typescript
async processOrder(order: Order): Promise<Order> {
  return this.workflowExecutor.executeWorkflow('order-processing', order, [
    {
      name: 'validate',
      handler: async (o) => this.validateOrder(o),
      emitEvent: 'order:validated',  // Simple string
    },
  ]);
}
```

**ChainEvent Factory (Rich Metadata)**
```typescript
async processOrder(order: Order): Promise<Order> {
  return this.workflowExecutor.executeWorkflow('order-processing', order, [
    {
      name: 'validate',
      handler: async (o) => this.validateOrder(o),
      emitEvent: (data) => ({
        name: 'order:validated',
        data,
        timestamp: Date.now(),
        tags: ['business', 'validation'],
        metadata: {
          itemCount: data.items.length,
          totalAmount: data.total,
          validationLevel: 'strict',
        },
        context: {
          executionId: this.generateExecutionId(),
        },
      }),
    },
    {
      name: 'payment',
      handler: async (o) => this.processPayment(o),
      emitEvent: (data) => ({
        name: 'order:paid',
        data,
        timestamp: Date.now(),
        tags: ['business', 'payment', 'critical'],
        metadata: {
          paymentMethod: data.paymentMethod,
          amount: data.total,
          currency: 'USD',
        },
      }),
    },
  ]);
}
```

#### Listening to ChainEvent

Event listeners use the `@OnChainEvent` decorator and receive the data payload directly:

```typescript
import { Injectable } from '@nestjs/common';
import { OnChainEvent } from '@azerothian/nestjs-chained';

@Injectable()
export class OrderAnalyticsService {
  @OnChainEvent('order:validated')
  async handleOrderValidated(order: Order): Promise<Order> {
    // Access the data directly
    this.logger.log({
      message: 'Order validated',
      orderId: order.id,
    });

    // Business analytics
    await this.trackOrderValidation(order);

    // Return data (optionally transformed)
    return order;
  }
}
```

> **Note**: The ChainEvent wrapper (with metadata, tags, context, timestamp) is managed internally by the framework. Handlers receive and return the data payload directly, keeping the API clean and focused on business logic.

#### Multiple Plugins Handling the Same ChainEvent

When multiple plugins register handlers for the same ChainEvent, the system executes them **sequentially** in the order determined by the plugin dependency graph. Each handler receives the data from the previous handler, enabling transformation chains.

**Execution Order**

Plugins with dependencies execute after their dependencies:

```typescript
import { Plugin, OnChainEvent } from '@azerothian/nestjs-chained';

@Plugin({
  name: 'logger',
  version: '1.0.0',
})
@Injectable()
export class LoggerPlugin {
  @OnChainEvent('order:validated')
  async handleOrderValidated(order: Order): Promise<Order> {
    console.log('Logging order validation:', order);

    // Return enriched data
    return {
      ...order,
      logged: true,
      loggedAt: Date.now(),
    };
  }
}

@Plugin({
  name: 'notification',
  version: '1.0.0',
  dependencies: ['logger'], // Executes after logger
})
@Injectable()
export class NotificationPlugin {
  @OnChainEvent('order:validated')
  async handleOrderValidated(order: Order): Promise<Order> {
    // Receives enriched data from logger handler
    console.log('Order was logged:', order.logged); // true

    await this.sendEmail(order);

    return {
      ...order,
      notified: true,
    };
  }
}
```

**Data Transformation Chain**

Each handler can transform the data, and the next handler receives the transformed version:

```typescript
// Execution flow:
// 1. LoggerPlugin receives:     { id: 1, total: 100 }
//    Returns:                    { id: 1, total: 100, logged: true, loggedAt: 1234567890 }
//
// 2. NotificationPlugin receives: { id: 1, total: 100, logged: true, loggedAt: 1234567890 }
//    Returns:                      { id: 1, total: 100, logged: true, loggedAt: 1234567890, notified: true }
//
// Final data: { id: 1, total: 100, logged: true, loggedAt: 1234567890, notified: true }
```

**Cancellation in ChainEvent Handlers**

Any handler in the chain can prevent further processing by throwing an error:

```typescript
@Plugin({
  name: 'fraud-detector',
  version: '1.0.0',
})
@Injectable()
export class FraudDetectorPlugin {
  @OnChainEvent('order:validated')
  async handleOrderValidated(order: Order): Promise<Order> {
    if (this.isFraudulent(order)) {
      // Throw to cancel the chain - subsequent handlers won't execute
      throw new FraudError('Fraudulent order detected');
    }

    return {
      ...order,
      fraudCheck: 'passed',
    };
  }
}

@Plugin({
  name: 'fulfillment',
  version: '1.0.0',
  dependencies: ['fraud-detector'],
})
@Injectable()
export class FulfillmentPlugin {
  @OnChainEvent('order:validated')
  async handleOrderValidated(order: Order): Promise<Order> {
    // Won't execute if fraud-detector throws
    await this.scheduleShipment(order);

    return {
      ...order,
      shipmentScheduled: true,
    };
  }
}
```

**Early Termination with finish()**

A handler can mark processing as finished using `ChainContextService.finish()` to skip remaining handlers. The returned data from that handler becomes the final result:

```typescript
import { ChainContextService } from '@azerothian/nestjs-chained';

@Plugin({
  name: 'cache-checker',
  version: '1.0.0',
})
@Injectable()
export class CacheCheckerPlugin {
  constructor(private readonly chainContext: ChainContextService) {}

  @OnChainEvent('data:fetch')
  async handleDataFetch(request: FetchRequest): Promise<any> {
    const cached = await this.cache.get(request.key);

    if (cached) {
      // Mark chain as finished - remaining handlers will be skipped
      this.chainContext.finish();

      // The returned data becomes the final result
      return {
        ...cached,
        fromCache: true,
      };
    }

    // Continue to next handler
    return request;
  }
}

@Plugin({
  name: 'database-fetcher',
  version: '1.0.0',
  dependencies: ['cache-checker'],
})
@Injectable()
export class DatabaseFetcherPlugin {
  @OnChainEvent('data:fetch')
  async handleDataFetch(request: FetchRequest): Promise<any> {
    // Only executes if cache-checker didn't call finish()
    const data = await this.db.query(request.key);

    return {
      ...data,
      fromCache: false,
    };
  }
}
```

When a handler calls `this.chainContext.finish()`, the chain terminates immediately after that handler completes, and the data returned by that handler is used as the final result. Like cancellation, the finish state is managed via `AsyncLocalStorage`, so it can be called from anywhere in the handler's call stack.

#### Event Filtering by Tags

Use the ChainEvent metadata (accessed via `ChainContextService`) to filter and route events:

```typescript
import { ChainContextService } from '@azerothian/nestjs-chained';

@Injectable()
export class CriticalEventHandler {
  constructor(private readonly chainContext: ChainContextService) {}

  @OnChainEvent('order:**')
  async handleOrderEvent(order: Order): Promise<Order> {
    // Access ChainEvent metadata via context
    const event = this.chainContext.getCurrentEvent();

    // Only process critical events
    if (event?.tags?.includes('critical')) {
      await this.escalate(order);
    }

    return order;
  }
}

@Injectable()
export class MetricsService {
  constructor(private readonly chainContext: ChainContextService) {}

  @OnChainEvent('**')  // Listen to all events
  async collectMetrics(data: any): Promise<any> {
    // Access event metadata via context
    const event = this.chainContext.getCurrentEvent();

    if (event) {
      // Collect metrics from all events
      this.metrics.increment(`events.${event.name}`);

      // Track by tag
      event.tags?.forEach(tag => {
        this.metrics.increment(`events.tag.${tag}`);
      });

      // Track duration if available
      if (event.context?.duration) {
        this.metrics.histogram(`events.${event.name}.duration`, event.context.duration);
      }
    }

    return data;
  }
}
```

#### Distributed Tracing with Execution Context

Use the `context` field for distributed tracing across services:

```typescript
async processNestedWorkflow(order: Order): Promise<Order> {
  const parentExecutionId = this.generateExecutionId();

  // Parent workflow
  const result = await this.workflowExecutor.executeWorkflow(
    'parent-workflow',
    order,
    [
      {
        name: 'process',
        handler: async (o) => {
          // Child workflow inherits parent context
          return this.childWorkflow(o, parentExecutionId);
        },
        emitEvent: (data) => ({
          name: 'parent:completed',
          data,
          timestamp: Date.now(),
          context: {
            executionId: parentExecutionId,
          },
        }),
      },
    ],
  );

  return result;
}

private async childWorkflow(order: Order, parentId: string): Promise<Order> {
  return this.workflowExecutor.executeWorkflow('child-workflow', order, [
    {
      name: 'child-step',
      handler: async (o) => this.processChild(o),
      emitEvent: (data) => ({
        name: 'child:completed',
        data,
        timestamp: Date.now(),
        context: {
          executionId: this.generateExecutionId(),
          parentExecutionId: parentId,  // Link to parent
        },
      }),
    },
  ]);
}
```

#### Custom Metadata for Observability

Add application-specific metadata for debugging and monitoring:

```typescript
{
  name: 'validate',
  handler: async (order) => this.validateOrder(order),
  emitEvent: (data) => ({
    name: 'order:validated',
    data,
    timestamp: Date.now(),
    tags: ['validation', 'business'],
    metadata: {
      // Business context
      customerId: data.customerId,
      region: data.shippingAddress.country,

      // Technical context
      validatorVersion: '2.0.0',
      rulesEngine: 'strict',
      cacheHit: false,

      // Performance metrics
      itemsValidated: data.items.length,
      validationTimeMs: 42,

      // Feature flags
      experimentGroup: 'control',
      featureFlags: ['new-validation', 'fraud-check-v2'],
    },
    context: {
      executionId: this.generateExecutionId(),
      duration: 42,
    },
  }),
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
| `pluginPaths` | `string[]` | `undefined` | Array of paths to dynamically load plugins from (npm packages or file paths) |

### ToastModule.forFeature()

Import in feature modules to enable plugin discovery:

```typescript
@Module({
  imports: [ToastModule.forFeature()],
  providers: [MyPlugin],
})
export class MyFeatureModule {}
```

### Dynamic Plugin Loading

Load plugins dynamically from npm packages or file system paths using the `pluginPaths` option. This is useful for:
- Loading plugins from external npm packages
- Loading plugins from local directories during development
- Enabling runtime plugin configuration

#### Basic Usage

```typescript
ToastModule.forRoot({
  pluginPaths: [
    'my-plugin-package',           // npm package
    '@company/custom-plugins',     // scoped npm package
    './plugins/custom',            // relative file path
    '/absolute/path/to/plugins',   // absolute file path
  ],
})
```

#### Loading from npm Packages

```typescript
@Module({
  imports: [
    ToastModule.forRoot({
      pluginPaths: [
        '@azerothian/nestjs-chained-logging',
        '@azerothian/nestjs-chained-metrics',
        '@mycompany/toast-plugins',
      ],
    }),
  ],
})
export class AppModule {}
```

Each npm package is imported using dynamic `import()` and scanned for `@Plugin()` decorated classes.

#### Loading from File System

```typescript
@Module({
  imports: [
    ToastModule.forRoot({
      pluginPaths: [
        './plugins',                    // relative to project root
        '../shared-plugins',            // relative path up one level
        '/opt/application/plugins',     // absolute path
      ],
    }),
  ],
})
export class AppModule {}
```

File paths can be relative (resolved from the application root) or absolute.

#### Mixing Both Approaches

```typescript
@Module({
  imports: [
    ToastModule.forRoot({
      pluginPaths: [
        // Production plugins from npm
        '@azerothian/nestjs-chained-auth',
        '@company/production-plugins',

        // Development plugins from local files
        process.env.NODE_ENV === 'development' ? './plugins/dev' : null,
      ].filter(Boolean),
    }),
  ],
})
export class AppModule {}
```

#### Loading Behavior

- **Dynamic Imports**: Each path is loaded using `import()` statements at runtime
- **Automatic Registration**: Loaded modules are scanned for `@Plugin()` decorated classes
- **Module Initialization**: Loading occurs during the NestJS module initialization phase
- **Plugin Discovery**: Loaded plugins are automatically registered with `PluginRegistryService`
- **Error Handling**: Errors during loading are logged and handled gracefully without crashing the application
- **Compatibility Validation**: If `validateCompatibility: true`, loaded plugins are validated before registration

#### Error Handling Example

```typescript
ToastModule.forRoot({
  pluginPaths: [
    'potentially-missing-package',  // Won't crash if missing
    './might-not-exist',            // Won't crash if missing
  ],
  validateCompatibility: true,      // Still validates successfully loaded plugins
})
```

If a path cannot be loaded, the error is logged but the application continues initialization with the successfully loaded plugins.

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
import { ToastModule } from '@azerothian/nestjs-chained';
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

#### @OnChainEvent(eventName: string)

Marks a method as a ChainEvent handler. When multiple plugins register handlers for the same event, they execute sequentially in plugin dependency order.

```typescript
import { Injectable } from '@nestjs/common';
import { OnChainEvent } from '@azerothian/nestjs-chained';

@Injectable()
export class OrderHandler {
  @OnChainEvent('order:validated')
  async handleOrderValidated(order: Order): Promise<Order> {
    // Handler receives data directly (not wrapped in ChainEvent)
    console.log('Processing order:', order.id);

    // Can transform and return data
    return {
      ...order,
      processed: true,
    };
  }

  @OnChainEvent('order:**')  // Wildcard pattern
  async handleAllOrderEvents(data: any): Promise<any> {
    // Matches all events starting with 'order:'
    return data;
  }
}
```

**Key Features:**
- Handlers receive the data payload directly (e.g., `Order`), not wrapped in `ChainEvent`
- Access ChainEvent metadata via `ChainContextService.getCurrentEvent()`
- Multiple handlers for the same event execute sequentially by dependency order
- Return value is passed to the next handler in the chain
- Can call `ChainContextService.cancel()` or `finish()` to control execution flow

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
| `finish` | `(): void` | Mark chain as finished (skip remaining handlers) |
| `isFinished` | `(): boolean` | Check if chain is marked as finished |
| `getContext` | `(): ChainContext \| undefined` | Get current context |
| `getReason` | `(): Error \| undefined` | Get cancellation reason |
| `getCurrentEvent` | `<T>(): ChainEvent<T> \| undefined` | Get current ChainEvent metadata (for @OnChainEvent handlers) |
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

// Standardized event structure for workflow and chain events
interface ChainEvent<T = any> {
  name: string;                    // Event name (e.g., 'order:validated')
  data: T;                         // Event payload
  workflow?: string;               // Workflow name if emitted from workflow
  step?: string;                   // Step name if emitted from workflow step
  timestamp: number;               // Unix timestamp (milliseconds)
  tags?: string[];                 // Classification tags (e.g., ['critical', 'business'])
  metadata?: Record<string, any>;  // Custom metadata for observability
  context?: {                      // Execution context for tracing
    executionId?: string;          // Unique execution identifier
    parentExecutionId?: string;    // Parent execution for nested workflows
    duration?: number;             // Step/workflow duration in milliseconds
  };
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
  emitEvent?: string | ((data: T) => ChainEvent<T>);  // Simple string or ChainEvent factory
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
import { ToastModule } from '@azerothian/nestjs-chained';

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
import { PluginRegistryService } from '@azerothian/nestjs-chained';

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
import { ToastModule } from '@azerothian/nestjs-chained';

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
import { ToastModule } from '@azerothian/nestjs-chained';
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

> **Note**: This section demonstrates standard NestJS event patterns using `@OnEvent` from `@nestjs/event-emitter`. For plugin handler chains with dependency-ordered execution, use `@OnChainEvent` as documented in the [Workflow Orchestration](#working-with-chainevent) section.

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

@azerothian/nestjs-chained provides a comprehensive toolkit for building modular NestJS applications:

1. **Plugin System** - `@Plugin()` decorator and `PluginRegistryService` for discoverable, metadata-rich components with dependency management

2. **Chain Execution** - `ChainExecutorService` and `ChainContextService` for waterfall, parallel, race, and pipeline execution patterns with `AsyncLocalStorage`-based cancellation (no context parameter threading)

3. **Workflow Orchestration** - `WorkflowExecutorService` for event-driven, multi-step workflows with automatic event emission

4. **Full NestJS Integration** - Works seamlessly with `@nestjs/config`, `@nestjs/event-emitter`, and NestJS lifecycle hooks
