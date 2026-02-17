# @azerothian/toast-bpmn

A BPMN workflow extension for @azerothian/toast, enabling visual workflow orchestration with type-safe execution.

## Table of Contents

| # | Section | Lines |
|---|---------|-------|
| 1 | [Installation](#installation) | 61-112 |
| 2 | [Overview](#overview) | 114-194 |
| | - [Architecture](#architecture) | 116-160 |
| | - [Key Features](#key-features) | 162-194 |
| 3 | [bpmn-moddle Integration](#bpmn-moddle-integration) | 196-305 |
| | - [Loading BPMN Files](#loading-bpmn-files) | 198-237 |
| | - [Parsing and Validation](#parsing-and-validation) | 239-271 |
| | - [Type Extraction](#type-extraction) | 273-305 |
| 4 | [Decorators](#decorators) | 307-499 |
| | - [@BpmnProcess](#bpmnprocess) | 309-369 |
| | - [@BpmnTask](#bpmntask) | 371-415 |
| | - [@BpmnContext](#bpmncontext) | 417-461 |
| | - [@RegisterType](#registertype) | 463-499 |
| 5 | [Interfaces](#interfaces) | 501-685 |
| | - [BaseBpmnContext](#basebpmncontext) | 503-555 |
| | - [BpmnProcessDefinition](#bpmnprocessdefinition) | 557-597 |
| | - [BpmnTaskDefinition](#bpmntaskdefinition) | 599-629 |
| | - [Distributed Processing Types](#distributed-processing-types) | 631-685 |
| 6 | [Services](#services) | 687-859 |
| | - [BpmnLoaderService](#bpmnloaderservice) | 689-726 |
| | - [BpmnExecutorService](#bpmnexecutorservice) | 728-774 |
| | - [BpmnContextService](#bpmncontextservice) | 776-824 |
| | - [BpmnTypeRegistryService](#bpmntyperegistryservice) | 826-859 |
| 7 | [Triggers](#triggers) | 861-965 |
| | - [Manual Trigger](#manual-trigger) | 863-893 |
| | - [Timer Trigger](#timer-trigger) | 895-931 |
| | - [TypeScript Trigger](#typescript-trigger) | 933-965 |
| 8 | [Processing Modes](#processing-modes) | 967-1135 |
| | - [Inline Processing](#inline-processing) | 969-1011 |
| | - [Distributed Processing](#distributed-processing) | 1013-1096 |
| | - [Context Serialization](#context-serialization) | 1098-1135 |
| 9 | [Execution Types](#execution-types) | 1137-1217 |
| | - [Synchronous Execution](#synchronous-execution) | 1139-1175 |
| | - [Asynchronous Execution](#asynchronous-execution) | 1177-1217 |
| 10 | [Timing and Stacktraces](#timing-and-stacktraces) | 1219-1304 |
| | - [Task Timing](#task-timing) | 1221-1269 |
| | - [Stacktrace Capture](#stacktrace-capture) | 1271-1304 |
| 11 | [XSD Extension](#xsd-extension) | 1306-1452 |
| | - [Schema Definition](#schema-definition) | 1308-1370 |
| | - [Validation](#validation) | 1372-1452 |
| 12 | [Toast Integration](#toast-integration) | 1454-1570 |
| | - [ChainEvent Integration](#chainevent-integration) | 1456-1506 |
| | - [Module Configuration](#module-configuration) | 1508-1570 |
| 13 | [Examples](#examples) | 1572-1758 |
| | - [Basic Workflow](#basic-workflow) | 1574-1645 |
| | - [Distributed Workflow](#distributed-workflow) | 1647-1710 |
| | - [Complex Multi-Step Process](#complex-multi-step-process) | 1712-1758 |
| 14 | [API Reference](#api-reference) | 1760-1814 |
| 15 | [Summary](#summary) | 1816-1829 |

---

## Installation

### Install Package

```bash
npm install @azerothian/toast-bpmn
```

### Peer Dependencies

Ensure you have the following peer dependencies installed:

```bash
npm install @azerothian/toast @nestjs/common @nestjs/core bpmn-moddle
```

For distributed processing, also install:

```bash
npm install bullmq ioredis
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@azerothian/toast` | ^1.0.0 | Core toast framework |
| `@nestjs/common` | ^10.0.0 | Core NestJS decorators and utilities |
| `@nestjs/core` | ^10.0.0 | NestJS runtime and dependency injection |
| `bpmn-moddle` | ^8.0.0 | BPMN 2.0 XML parsing and modeling |
| `bullmq` | ^5.0.0 | Distributed job queue (optional) |
| `ioredis` | ^5.0.0 | Redis client for context storage (optional) |

### Module Registration

```typescript
import { Module } from '@nestjs/common';
import { ToastModule } from '@azerothian/toast';
import { ToastBpmnModule } from '@azerothian/toast-bpmn';

@Module({
  imports: [
    ToastModule.forRoot(),
    ToastBpmnModule.forRoot({
      bpmnPath: './workflows',
      validateOnLoad: true,
      processingMode: 'inline',
    }),
  ],
})
export class AppModule {}
```

---

## Overview

### Architecture

```mermaid
graph TB
    subgraph ToastBpmn["@azerothian/toast-bpmn"]
        Loader[BpmnLoaderService]
        Executor[BpmnExecutorService]
        Context[BpmnContextService]
        TypeReg[BpmnTypeRegistryService]
        Validator[BpmnValidatorService]
    end

    subgraph External
        Moddle[bpmn-moddle]
        XSD[XSD Schema]
        Redis[(Redis)]
        BullMQ[BullMQ Workers]
    end

    subgraph Toast["@azerothian/toast"]
        Chain[ChainExecutorService]
        Events[OnChainEvent Handlers]
    end

    BPMN[BPMN File] --> Loader
    Loader --> Moddle
    Loader --> Validator
    Validator --> XSD
    Loader --> TypeReg

    Executor --> Context
    Executor --> Chain
    Chain --> Events

    Context --> Redis
    Executor --> BullMQ
```

The architecture follows a layered approach:

1. **Loading Layer**: `BpmnLoaderService` uses `bpmn-moddle` to parse BPMN XML files
2. **Validation Layer**: `BpmnValidatorService` validates against XSD schema and type constraints
3. **Type Registry**: `BpmnTypeRegistryService` manages TypeScript types extracted from the project
4. **Execution Layer**: `BpmnExecutorService` orchestrates task execution via toast's `ChainExecutorService`
5. **Context Layer**: `BpmnContextService` manages process context with optional Redis persistence

### Key Features

| Feature | Description |
|---------|-------------|
| **Type-Safe Connections** | All BPMN sequence flows are constrained by TypeScript types |
| **ChainedEvent Tasks** | BPMN tasks map to `@OnChainEvent` handlers with validated I/O |
| **Flexible Processing** | Choose between inline loop or distributed BullMQ workers |
| **Context Tracking** | Automatic process ID and step tracking via `BaseBpmnContext` |
| **Sync/Async Modes** | Define execution type per process for immediate or deferred response |
| **Timing & Traces** | Built-in timing and stacktrace capture for debugging |
| **XSD Validation** | Custom BPMN extensions validated against XSD schema |

```typescript
// Type-safe workflow definition
interface OrderInput {
  orderId: string;
  items: Item[];
}

interface OrderOutput {
  success: boolean;
  trackingNumber?: string;
}

@BpmnProcess<OrderContext, OrderInput, OrderOutput>({
  name: 'order-fulfillment',
  executionType: 'async',
  processingMode: 'distributed',
})
export class OrderFulfillmentProcess {}
```

---

## bpmn-moddle Integration

### Loading BPMN Files

The `BpmnLoaderService` uses [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle) to parse BPMN 2.0 XML files into a traversable JavaScript object model.

```typescript
import { Injectable } from '@nestjs/common';
import { BpmnLoaderService } from '@azerothian/toast-bpmn';

@Injectable()
export class WorkflowService {
  constructor(private readonly bpmnLoader: BpmnLoaderService) {}

  async loadWorkflow(bpmnPath: string) {
    const definition = await this.bpmnLoader.load(bpmnPath);
    return definition;
  }
}
```

**Configuration Options:**

```typescript
ToastBpmnModule.forRoot({
  bpmnPath: './workflows',           // Base path for BPMN files
  validateOnLoad: true,              // Validate against XSD on load
  strictTypeChecking: true,          // Require all types to exist
  extensions: ['./custom-ext.json'], // Custom moddle extensions
});
```

**Directory Structure:**

```
workflows/
├── order-fulfillment.bpmn
├── user-registration.bpmn
├── payment-processing.bpmn
└── types/
    └── index.ts                     # Type definitions
```

### Parsing and Validation

When a BPMN file is loaded, toast-bpmn performs multi-stage validation:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  typeConstraints: TypeConstraint[];
}

// Validation stages
const stages = [
  'xsd-schema',        // Validate against BPMN 2.0 XSD + extensions
  'type-constraints',  // Verify all connection types exist
  'handler-mapping',   // Ensure all tasks map to registered handlers
  'context-compat',    // Check context decorator compatibility
];
```

**Type Constraint Validation:**

```typescript
// BPMN sequence flow with type constraint
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2">
  <toast:typeConstraint>
    <toast:type>OrderValidationResult</toast:type>
  </toast:typeConstraint>
</bpmn:sequenceFlow>
```

If `OrderValidationResult` is not found in the project's types, an error is thrown at load time.

### Type Extraction

Types are automatically extracted from your project using the TypeScript compiler API:

```typescript
// BpmnTypeRegistryService scans for @RegisterType decorators
@RegisterType()
export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
  orderId: string;
}

@RegisterType()
export interface PaymentResult {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
}
```

**Automatic Type Discovery:**

```typescript
ToastBpmnModule.forRoot({
  typeDiscovery: {
    paths: ['./src/workflows/types/**/*.ts'],
    decoratorName: 'RegisterType',
    strict: true, // Fail if referenced type not found
  },
});
```

---

## Decorators

### @BpmnProcess

Defines a BPMN process with type-safe input, output, and context types.

```typescript
import { BpmnProcess } from '@azerothian/toast-bpmn';

interface OrderContext extends BaseBpmnContext {
  order: Order;
  customer: Customer;
  validationResult?: ValidationResult;
}

interface OrderInput {
  orderId: string;
  customerId: string;
}

interface OrderOutput {
  success: boolean;
  message: string;
  trackingNumber?: string;
}

@BpmnProcess<OrderContext, OrderInput, OrderOutput>({
  name: 'order-fulfillment',
  bpmnFile: 'order-fulfillment.bpmn',
  executionType: 'sync',       // 'sync' | 'async'
  processingMode: 'inline',    // 'inline' | 'distributed'
  timeout: 30000,              // Optional timeout in ms
})
export class OrderFulfillmentProcess {
  // Process-level handlers and hooks

  @OnProcessStart()
  async onStart(context: OrderContext) {
    console.log(`Starting process ${context.processId}`);
  }

  @OnProcessComplete()
  async onComplete(context: OrderContext, output: OrderOutput) {
    console.log(`Process completed: ${output.success}`);
  }

  @OnProcessError()
  async onError(context: OrderContext, error: Error) {
    console.error(`Process failed: ${error.message}`);
  }
}
```

**Decorator Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Unique process identifier |
| `bpmnFile` | `string` | Path to BPMN file (relative to bpmnPath) |
| `executionType` | `'sync' \| 'async'` | Determines response behavior |
| `processingMode` | `'inline' \| 'distributed'` | Task execution strategy |
| `timeout` | `number` | Optional process timeout in milliseconds |
| `retryPolicy` | `RetryPolicy` | Retry configuration for failed tasks |

### @BpmnTask

Defines a task handler that maps to a BPMN task element via ChainedEvent.

```typescript
import { BpmnTask } from '@azerothian/toast-bpmn';

@Injectable()
export class OrderValidationTasks {

  @BpmnTask<ValidateOrderInput, ValidateOrderOutput>({
    taskId: 'Task_ValidateOrder',
    inputType: 'ValidateOrderInput',
    outputType: 'ValidateOrderOutput',
  })
  @OnChainEvent<ValidateOrderOutput>('order.validate')
  async validateOrder(
    input: ValidateOrderInput,
  ): Promise<ValidateOrderOutput> {
    // Validation logic
    const isValid = await this.validateOrderItems(input.items);

    return {
      valid: isValid,
      errors: isValid ? [] : ['Invalid items'],
      orderId: input.orderId,
    };
  }
}
```

The `@BpmnTask` decorator works in conjunction with `@OnChainEvent` to:
1. Register the handler with the BPMN task ID
2. Extract and validate input/output types at load time
3. Enable automatic type checking for sequence flow connections

**Task Options:**

| Option | Type | Description |
|--------|------|-------------|
| `taskId` | `string` | BPMN task element ID |
| `inputType` | `string` | Registered type name for input validation |
| `outputType` | `string` | Registered type name for output validation |
| `timeout` | `number` | Optional task-level timeout |
| `retryable` | `boolean` | Whether task can be retried on failure |

### @BpmnContext

Decorates a parameter to inject the BPMN context into a task handler.

```typescript
import { BpmnContext, BpmnTask } from '@azerothian/toast-bpmn';

@Injectable()
export class PaymentTasks {

  @BpmnTask({
    taskId: 'Task_ProcessPayment',
    inputType: 'PaymentInput',
    outputType: 'PaymentResult',
  })
  @OnChainEvent<PaymentResult, [OrderContext]>('payment.process')
  async processPayment(
    input: PaymentInput,
    @BpmnContext() context: OrderContext,
  ): Promise<PaymentResult> {
    // Access context for process state
    console.log(`Processing payment for process: ${context.processId}`);
    console.log(`Current step: ${context.currentStep}`);

    // Context modifications are tracked
    context.paymentAttempts = (context.paymentAttempts || 0) + 1;

    return {
      transactionId: 'txn_123',
      status: 'success',
    };
  }
}
```

**Context Type Validation:**

If a handler uses `@BpmnContext()` with a type that doesn't match the process's context type, an error is thrown at load time:

```typescript
// This will throw an error at load time if OrderContext doesn't match
@BpmnTask({ taskId: 'Task_1' })
@OnChainEvent<void, [DifferentContext]>('task.execute')
async execute(input: unknown, @BpmnContext() context: DifferentContext) {} // Error!
```

### @RegisterType

Registers a TypeScript interface/type with the BPMN type registry for connection validation.

```typescript
import { RegisterType } from '@azerothian/toast-bpmn';

@RegisterType()
export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
  orderId: string;
}

@RegisterType({ name: 'PaymentResultV2' }) // Custom name
export interface PaymentResult {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
}

@RegisterType({ schema: orderItemSchema }) // With JSON schema
export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Optional custom name (defaults to interface name) |
| `schema` | `JSONSchema` | Optional JSON schema for runtime validation |

---

## Interfaces

### BaseBpmnContext

Base interface for all BPMN process contexts, providing automatic tracking.

```typescript
export interface BaseBpmnContext {
  /** Unique identifier for this process instance */
  processId: string;

  /** BPMN process definition name */
  processName: string;

  /** Current step/task being executed */
  currentStep: string;

  /** Previous step/task that was executed */
  previousStep?: string;

  /** Timestamp when process started */
  startedAt: Date;

  /** Step execution history */
  stepHistory: StepHistoryEntry[];

  /** Process variables (user-defined data) */
  variables: Record<string, unknown>;
}

export interface StepHistoryEntry {
  stepId: string;
  stepName: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  status: 'completed' | 'failed' | 'skipped';
  error?: string;
}
```

**Extending BaseBpmnContext:**

```typescript
interface OrderContext extends BaseBpmnContext {
  // Process-specific data
  order: Order;
  customer: Customer;

  // Task results stored in context
  validationResult?: OrderValidationResult;
  paymentResult?: PaymentResult;
  shippingResult?: ShippingResult;
}
```

### BpmnProcessDefinition

Represents a parsed BPMN process with metadata.

```typescript
export interface BpmnProcessDefinition<
  TContext extends BaseBpmnContext = BaseBpmnContext,
  TInput = unknown,
  TOutput = unknown,
> {
  /** Process name/identifier */
  name: string;

  /** Path to source BPMN file */
  bpmnFile: string;

  /** Parsed bpmn-moddle definitions */
  definitions: ModdleDefinitions;

  /** All task definitions in the process */
  tasks: BpmnTaskDefinition[];

  /** Sequence flow connections with type constraints */
  flows: BpmnSequenceFlow[];

  /** Start events */
  startEvents: BpmnStartEvent[];

  /** End events */
  endEvents: BpmnEndEvent[];

  /** Execution configuration */
  executionType: 'sync' | 'async';
  processingMode: 'inline' | 'distributed';

  /** Type information */
  contextType: string;
  inputType: string;
  outputType: string;
}
```

### BpmnTaskDefinition

Represents a task within a BPMN process.

```typescript
export interface BpmnTaskDefinition {
  /** BPMN element ID */
  id: string;

  /** Task name/label */
  name: string;

  /** Task type (serviceTask, userTask, etc.) */
  type: BpmnTaskType;

  /** ChainEvent name for this task */
  chainEventName: string;

  /** Input type constraint */
  inputType: string;

  /** Output type constraint */
  outputType: string;

  /** Incoming sequence flows */
  incoming: string[];

  /** Outgoing sequence flows */
  outgoing: string[];
}
```

### Distributed Processing Types

Types for distributed processing with BullMQ and Redis.

```typescript
export interface DistributedTaskPayload<T = unknown> {
  /** Process instance ID */
  processId: string;

  /** Task definition ID */
  taskId: string;

  /** Serialized task input */
  input: T;

  /** Redis key for context */
  contextKey: string;

  /** Timestamp */
  timestamp: number;
}

export interface SerializedContext {
  /** JSON-serialized context data */
  data: string;

  /** Context type name for deserialization */
  typeName: string;

  /** Version for migration support */
  version: number;

  /** Checksum for integrity */
  checksum: string;
}

export interface TaskResult<T = unknown> {
  /** Whether task succeeded */
  success: boolean;

  /** Task output (if successful) */
  output?: T;

  /** Error message (if failed) */
  error?: string;

  /** Execution duration in ms */
  duration: number;

  /** Stacktrace (if error and enabled) */
  stacktrace?: string;
}
```

---

## Services

### BpmnLoaderService

Loads and parses BPMN files using bpmn-moddle.

```typescript
import { Injectable } from '@nestjs/common';
import { BpmnLoaderService } from '@azerothian/toast-bpmn';

@Injectable()
export class WorkflowManager {
  constructor(private readonly loader: BpmnLoaderService) {}

  async loadAllWorkflows() {
    // Load single file
    const orderProcess = await this.loader.load('order-fulfillment.bpmn');

    // Load all files in directory
    const allProcesses = await this.loader.loadDirectory('./workflows');

    // Load with custom extensions
    const customProcess = await this.loader.load('custom.bpmn', {
      extensions: ['./toast-extension.json'],
    });

    return allProcesses;
  }
}
```

**Methods:**

| Method | Description |
|--------|-------------|
| `load(path)` | Load single BPMN file |
| `loadDirectory(dir)` | Load all BPMN files in directory |
| `reload(name)` | Reload a previously loaded process |
| `getDefinition(name)` | Get loaded process definition |
| `validateFile(path)` | Validate BPMN file without loading |

### BpmnExecutorService

Executes BPMN processes, orchestrating task execution via toast's ChainExecutorService.

```typescript
import { Injectable } from '@nestjs/common';
import { BpmnExecutorService } from '@azerothian/toast-bpmn';

@Injectable()
export class OrderService {
  constructor(private readonly executor: BpmnExecutorService) {}

  async fulfillOrder(input: OrderInput): Promise<OrderOutput> {
    // Execute synchronously (waits for completion)
    const result = await this.executor.execute<OrderContext, OrderInput, OrderOutput>(
      'order-fulfillment',
      input,
    );

    return result;
  }

  async startOrderAsync(input: OrderInput): Promise<ProcessStartResult> {
    // Execute asynchronously (returns message ID)
    const { processId, messageId } = await this.executor.executeAsync(
      'order-fulfillment',
      input,
    );

    return { processId, messageId };
  }

  async getProcessStatus(processId: string) {
    return this.executor.getStatus(processId);
  }
}
```

**Methods:**

| Method | Description |
|--------|-------------|
| `execute(name, input)` | Execute process synchronously |
| `executeAsync(name, input)` | Start process asynchronously |
| `getStatus(processId)` | Get process execution status |
| `cancel(processId)` | Cancel running process |
| `retry(processId, taskId)` | Retry failed task |

### BpmnContextService

Manages BPMN process context with support for Redis persistence.

```typescript
import { Injectable } from '@nestjs/common';
import { BpmnContextService } from '@azerothian/toast-bpmn';

@Injectable()
export class ContextManager {
  constructor(private readonly contextService: BpmnContextService) {}

  async createContext<T extends BaseBpmnContext>(
    processName: string,
    initialData: Partial<T>,
  ): Promise<T> {
    return this.contextService.create<T>(processName, initialData);
  }

  async updateContext<T extends BaseBpmnContext>(
    processId: string,
    updates: Partial<T>,
  ): Promise<T> {
    return this.contextService.update<T>(processId, updates);
  }

  async getContext<T extends BaseBpmnContext>(
    processId: string,
  ): Promise<T | null> {
    return this.contextService.get<T>(processId);
  }
}
```

**Redis Configuration:**

```typescript
ToastBpmnModule.forRoot({
  context: {
    storage: 'redis',
    redis: {
      host: 'localhost',
      port: 6379,
      keyPrefix: 'bpmn:context:',
      ttl: 86400, // 24 hours
    },
  },
});
```

### BpmnTypeRegistryService

Manages registered types for connection validation.

```typescript
import { Injectable } from '@nestjs/common';
import { BpmnTypeRegistryService } from '@azerothian/toast-bpmn';

@Injectable()
export class TypeManager {
  constructor(private readonly typeRegistry: BpmnTypeRegistryService) {}

  registerTypes() {
    // Types are auto-registered via @RegisterType decorator
    // Manual registration also supported
    this.typeRegistry.register('CustomType', {
      properties: {
        id: { type: 'string' },
        value: { type: 'number' },
      },
    });
  }

  validateType(typeName: string, data: unknown): boolean {
    return this.typeRegistry.validate(typeName, data);
  }

  getTypeSchema(typeName: string) {
    return this.typeRegistry.getSchema(typeName);
  }
}
```

---

## Triggers

### Manual Trigger

Start a BPMN process manually from code.

```typescript
import { Injectable } from '@nestjs/common';
import { BpmnExecutorService, ManualTrigger } from '@azerothian/toast-bpmn';

@Injectable()
export class OrderController {
  constructor(private readonly executor: BpmnExecutorService) {}

  @Post('/orders')
  async createOrder(@Body() input: CreateOrderInput) {
    // Manual trigger via executor
    const result = await this.executor.execute('order-fulfillment', {
      orderId: input.orderId,
      items: input.items,
    });

    return result;
  }
}

// Or use ManualTrigger utility
@Injectable()
export class OrderTriggers {
  @ManualTrigger('order-fulfillment')
  triggerOrderFulfillment: (input: OrderInput) => Promise<OrderOutput>;
}
```

### Timer Trigger

Start BPMN processes on a schedule using timer events.

```typescript
import { TimerTrigger } from '@azerothian/toast-bpmn';

// BPMN Timer Start Event definition
<bpmn:startEvent id="StartEvent_Timer">
  <bpmn:timerEventDefinition>
    <bpmn:timeCycle>0 0 * * *</bpmn:timeCycle> <!-- Daily at midnight -->
  </bpmn:timerEventDefinition>
</bpmn:startEvent>

// Programmatic timer trigger
@Injectable()
export class ScheduledTriggers {
  @TimerTrigger({
    processName: 'daily-report',
    cron: '0 0 * * *',
    timezone: 'UTC',
  })
  async generateDailyReport() {
    return { date: new Date().toISOString() };
  }
}
```

**Timer Options:**

| Option | Type | Description |
|--------|------|-------------|
| `cron` | `string` | Cron expression |
| `timezone` | `string` | Timezone for cron |
| `interval` | `number` | Interval in milliseconds |
| `startDate` | `Date` | When to start triggering |
| `endDate` | `Date` | When to stop triggering |

### TypeScript Trigger

Trigger BPMN processes from TypeScript code with full type safety.

```typescript
import { TypeScriptTrigger, InjectBpmnTrigger } from '@azerothian/toast-bpmn';

// Define typed trigger
const OrderFulfillmentTrigger = TypeScriptTrigger<OrderInput, OrderOutput>(
  'order-fulfillment',
);

@Injectable()
export class OrderService {
  constructor(
    @InjectBpmnTrigger('order-fulfillment')
    private readonly triggerOrder: typeof OrderFulfillmentTrigger,
  ) {}

  async processOrder(orderId: string) {
    // Fully typed trigger invocation
    const result = await this.triggerOrder({
      orderId,
      items: [],
    });

    // result is typed as OrderOutput
    console.log(result.trackingNumber);
  }
}
```

---

## Processing Modes

### Inline Processing

Tasks execute sequentially in a loop within the same process.

```typescript
@BpmnProcess({
  name: 'quick-validation',
  processingMode: 'inline',
  executionType: 'sync',
})
export class QuickValidationProcess {}
```

**Execution Flow:**

```
┌─────────────────────────────────────────────────────┐
│                 Inline Processing                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│   │  Task 1  │ → │  Task 2  │ → │  Task 3  │       │
│   └──────────┘   └──────────┘   └──────────┘       │
│        ↓              ↓              ↓              │
│   [Execute]      [Execute]      [Execute]          │
│        ↓              ↓              ↓              │
│   [Continue]     [Continue]     [Complete]         │
│                                                      │
│   All tasks run in same process/thread              │
│   Context passed directly between tasks             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Advantages:**
- Lower latency (no serialization overhead)
- Simpler debugging
- No external dependencies

**Use When:**
- Fast-executing tasks (< 1 second each)
- No need for distributed scaling
- Development/testing environments

### Distributed Processing

Tasks execute via BullMQ workers with Redis-based context storage.

```typescript
@BpmnProcess({
  name: 'order-fulfillment',
  processingMode: 'distributed',
  executionType: 'async',
})
export class OrderFulfillmentProcess {}

// Worker configuration
ToastBpmnModule.forRoot({
  processingMode: 'distributed',
  distributed: {
    redis: {
      host: 'localhost',
      port: 6379,
    },
    queues: {
      default: {
        concurrency: 5,
        limiter: {
          max: 100,
          duration: 1000,
        },
      },
    },
  },
});
```

**Execution Flow:**

```
┌─────────────────────────────────────────────────────┐
│              Distributed Processing                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────┐        ┌─────────────┐              │
│   │ Executor │───────▶│   BullMQ    │              │
│   └──────────┘        │   Queue     │              │
│                       └──────┬──────┘              │
│                              │                      │
│              ┌───────────────┼───────────────┐     │
│              ▼               ▼               ▼     │
│        ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│        │ Worker 1 │   │ Worker 2 │   │ Worker 3 │ │
│        └────┬─────┘   └────┬─────┘   └────┬─────┘ │
│             │              │              │        │
│             ▼              ▼              ▼        │
│        ┌─────────────────────────────────────┐    │
│        │              Redis                   │    │
│        │    (Context Storage + Events)        │    │
│        └─────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Predefined Chain Events for Serialization:**

```typescript
// Built-in events for context serialization/deserialization
export const BPMN_CONTEXT_SERIALIZE = 'bpmn.context.serialize';
export const BPMN_CONTEXT_DESERIALIZE = 'bpmn.context.deserialize';

// Usage in distributed tasks
@OnChainEvent<BaseBpmnContext>(BPMN_CONTEXT_DESERIALIZE)
async deserializeContext(
  payload: { contextKey: string },
): Promise<BaseBpmnContext> {
  // Retrieve and deserialize from Redis
  return this.contextService.deserialize(payload.contextKey);
}

@OnChainEvent<{ contextKey: string }>(BPMN_CONTEXT_SERIALIZE)
async serializeContext(
  context: BaseBpmnContext,
): Promise<{ contextKey: string }> {
  // Serialize and store in Redis
  return this.contextService.serialize(context);
}
```

### Context Serialization

For distributed processing, context must be serialized to Redis.

```typescript
// Automatic serialization via BpmnContextService
const contextService = new BpmnContextService(redisClient);

// Serialize context to Redis
const contextKey = await contextService.serialize(context);
// Returns: 'bpmn:context:order-fulfillment:abc123'

// Deserialize context from Redis
const restored = await contextService.deserialize<OrderContext>(contextKey);

// Context includes automatic tracking
console.log(restored.processId);      // 'abc123'
console.log(restored.currentStep);    // 'Task_ProcessPayment'
console.log(restored.stepHistory);    // [...previous steps...]
```

**Serialization Format:**

```typescript
interface SerializedContext {
  data: string;       // JSON.stringify(context)
  typeName: string;   // 'OrderContext'
  version: number;    // 1
  checksum: string;   // MD5 hash for integrity
}

// Storage structure in Redis
// Key: bpmn:context:{processName}:{processId}
// Value: SerializedContext as JSON
// TTL: Configurable (default 24 hours)
```

---

## Execution Types

### Synchronous Execution

The caller waits for the entire process to complete.

```typescript
@BpmnProcess({
  name: 'quick-validation',
  executionType: 'sync',
})
export class QuickValidationProcess {}

// Usage
const result = await executor.execute('quick-validation', input);
// Blocks until process completes
console.log(result); // Final output
```

**Sync Execution Flow:**

```
Client                    Executor                   Tasks
   │                          │                        │
   │──execute(input)─────────▶│                        │
   │                          │──execute Task 1───────▶│
   │                          │◀──────result──────────│
   │                          │──execute Task 2───────▶│
   │                          │◀──────result──────────│
   │                          │──execute Task N───────▶│
   │                          │◀──────result──────────│
   │◀────final result────────│                        │
   │                          │                        │
```

**Use When:**
- Short-running processes (< 30 seconds)
- Client needs immediate result
- Request-response patterns

### Asynchronous Execution

The caller receives a message ID immediately; process runs in background.

```typescript
@BpmnProcess({
  name: 'order-fulfillment',
  executionType: 'async',
})
export class OrderFulfillmentProcess {}

// Usage
const { processId, messageId } = await executor.executeAsync(
  'order-fulfillment',
  input,
);
// Returns immediately with tracking IDs

// Poll for status
const status = await executor.getStatus(processId);
// { status: 'running', currentStep: 'Task_ProcessPayment' }

// Or listen for completion event
@OnChainEvent<void>('bpmn.process.completed')
async onProcessComplete(event: ProcessCompletedEvent): Promise<void> {
  console.log(`Process ${event.processId} completed`);
}
```

**Async Response:**

```typescript
interface AsyncExecutionResult {
  processId: string;    // Unique process instance ID
  messageId: string;    // BullMQ job ID (if distributed)
  status: 'queued' | 'started';
  startedAt: Date;
}
```

---

## Timing and Stacktraces

### Task Timing

Every task execution is automatically timed.

```typescript
// Enable detailed timing
ToastBpmnModule.forRoot({
  timing: {
    enabled: true,
    includeQueueTime: true,    // For distributed mode
    precision: 'milliseconds', // 'milliseconds' | 'microseconds'
  },
});

// Access timing data
const execution = await executor.execute('my-process', input);

// Timing available in step history
for (const step of execution.context.stepHistory) {
  console.log(`${step.stepName}: ${step.duration}ms`);
}

// Aggregate timing
const timing = await executor.getTiming(processId);
console.log(`Total: ${timing.totalDuration}ms`);
console.log(`Queue time: ${timing.queueTime}ms`);
console.log(`Execution time: ${timing.executionTime}ms`);
```

**Timing Interface:**

```typescript
interface TaskTiming {
  taskId: string;
  taskName: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  queueTime?: number;  // Time spent in queue (distributed)
}

interface ProcessTiming {
  processId: string;
  totalDuration: number;
  queueTime: number;
  executionTime: number;
  tasks: TaskTiming[];
}
```

### Stacktrace Capture

Capture stacktraces for debugging failures.

```typescript
// Enable stacktrace capture
ToastBpmnModule.forRoot({
  debugging: {
    captureStacktraces: true,
    stacktraceDepth: 10,
    includeNodeModules: false,
  },
});

// Stacktraces included in errors
try {
  await executor.execute('my-process', input);
} catch (error) {
  if (error instanceof BpmnExecutionError) {
    console.log('Failed at:', error.taskId);
    console.log('Stacktrace:', error.stacktrace);
    console.log('Context at failure:', error.context);
  }
}

// Also available in process status
const status = await executor.getStatus(processId);
if (status.status === 'failed') {
  console.log(status.error);
  console.log(status.stacktrace);
}
```

---

## XSD Extension

### Schema Definition

Custom XSD schema extends BPMN 2.0 for toast-bpmn elements.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsd:schema
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:toast="http://azerothian.io/schema/toast-bpmn"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  targetNamespace="http://azerothian.io/schema/toast-bpmn"
  elementFormDefault="qualified">

  <!-- Type Constraint for Sequence Flows -->
  <xsd:element name="typeConstraint" type="toast:tTypeConstraint"/>
  <xsd:complexType name="tTypeConstraint">
    <xsd:sequence>
      <xsd:element name="type" type="xsd:string" minOccurs="1" maxOccurs="1"/>
      <xsd:element name="strict" type="xsd:boolean" default="true" minOccurs="0"/>
    </xsd:sequence>
  </xsd:complexType>

  <!-- Task Configuration -->
  <xsd:element name="taskConfig" type="toast:tTaskConfig"/>
  <xsd:complexType name="tTaskConfig">
    <xsd:sequence>
      <xsd:element name="chainEventName" type="xsd:string"/>
      <xsd:element name="inputType" type="xsd:string" minOccurs="0"/>
      <xsd:element name="outputType" type="xsd:string" minOccurs="0"/>
      <xsd:element name="timeout" type="xsd:int" minOccurs="0"/>
      <xsd:element name="retryable" type="xsd:boolean" default="false" minOccurs="0"/>
    </xsd:sequence>
  </xsd:complexType>

  <!-- Process Configuration -->
  <xsd:element name="processConfig" type="toast:tProcessConfig"/>
  <xsd:complexType name="tProcessConfig">
    <xsd:sequence>
      <xsd:element name="contextType" type="xsd:string"/>
      <xsd:element name="inputType" type="xsd:string"/>
      <xsd:element name="outputType" type="xsd:string"/>
      <xsd:element name="executionType" type="toast:tExecutionType"/>
      <xsd:element name="processingMode" type="toast:tProcessingMode"/>
    </xsd:sequence>
  </xsd:complexType>

  <!-- Enumerations -->
  <xsd:simpleType name="tExecutionType">
    <xsd:restriction base="xsd:string">
      <xsd:enumeration value="sync"/>
      <xsd:enumeration value="async"/>
    </xsd:restriction>
  </xsd:simpleType>

  <xsd:simpleType name="tProcessingMode">
    <xsd:restriction base="xsd:string">
      <xsd:enumeration value="inline"/>
      <xsd:enumeration value="distributed"/>
    </xsd:restriction>
  </xsd:simpleType>

</xsd:schema>
```

### Validation

BPMN files are validated against the extended schema.

```typescript
import { BpmnValidatorService } from '@azerothian/toast-bpmn';

@Injectable()
export class WorkflowValidator {
  constructor(private readonly validator: BpmnValidatorService) {}

  async validateWorkflow(bpmnPath: string) {
    const result = await this.validator.validate(bpmnPath);

    if (!result.valid) {
      for (const error of result.errors) {
        console.error(`Line ${error.line}: ${error.message}`);
      }
    }

    return result;
  }
}

// Validation happens automatically on load
ToastBpmnModule.forRoot({
  validateOnLoad: true,
  xsdPath: './schemas/toast-bpmn.xsd',
});
```

**BPMN File with Toast Extensions:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:toast="http://azerothian.io/schema/toast-bpmn"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI">

  <bpmn:process id="OrderFulfillment" name="Order Fulfillment">
    <bpmn:extensionElements>
      <toast:processConfig>
        <toast:contextType>OrderContext</toast:contextType>
        <toast:inputType>OrderInput</toast:inputType>
        <toast:outputType>OrderOutput</toast:outputType>
        <toast:executionType>async</toast:executionType>
        <toast:processingMode>distributed</toast:processingMode>
      </toast:processConfig>
    </bpmn:extensionElements>

    <bpmn:startEvent id="Start"/>

    <bpmn:serviceTask id="Task_ValidateOrder" name="Validate Order">
      <bpmn:extensionElements>
        <toast:taskConfig>
          <toast:chainEventName>order.validate</toast:chainEventName>
          <toast:inputType>OrderInput</toast:inputType>
          <toast:outputType>ValidationResult</toast:outputType>
        </toast:taskConfig>
      </bpmn:extensionElements>
    </bpmn:serviceTask>

    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Task_ValidateOrder"/>

    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_ValidateOrder" targetRef="Task_ProcessPayment">
      <bpmn:extensionElements>
        <toast:typeConstraint>
          <toast:type>ValidationResult</toast:type>
        </toast:typeConstraint>
      </bpmn:extensionElements>
    </bpmn:sequenceFlow>

    <!-- More tasks and flows... -->

    <bpmn:endEvent id="End"/>
  </bpmn:process>
</bpmn:definitions>
```

---

## Toast Integration

### ChainEvent Integration

BPMN tasks map directly to toast `@OnChainEvent` handlers.

```typescript
import { OnChainEvent } from '@azerothian/toast';
import { BpmnTask, BpmnContext } from '@azerothian/toast-bpmn';

@Injectable()
export class OrderTasks {
  // BPMN task mapped to ChainEvent
  @BpmnTask({
    taskId: 'Task_ValidateOrder',
    inputType: 'OrderInput',
    outputType: 'ValidationResult',
  })
  @OnChainEvent<ValidationResult, [OrderContext]>('order.validate')
  async validateOrder(
    input: OrderInput,
    @BpmnContext() context: OrderContext,
  ): Promise<ValidationResult> {
    // Validation logic
    return { valid: true, errors: [] };
  }

  // Multi-argument chain handler (toast feature)
  // First arg is chained return value, remaining args are constant initial arguments
  @BpmnTask({
    taskId: 'Task_ProcessPayment',
    inputType: 'PaymentInput',
    outputType: 'PaymentResult',
  })
  @OnChainEvent<PaymentResult, [OrderContext, string, PaymentMethod]>('payment.process')
  async processPayment(
    amount: number,
    @BpmnContext() context: OrderContext,
    currency: string,
    method: PaymentMethod,
  ): Promise<PaymentResult> {
    // Payment processing
    return { transactionId: 'txn_123', status: 'success' };
  }
}
```

**How It Works:**

1. BPMN task element has `toast:taskConfig` with `chainEventName`
2. `@BpmnTask` decorator registers the mapping
3. At runtime, `BpmnExecutorService` calls `ChainExecutorService.waterfall()`
4. Chain executor invokes the `@OnChainEvent` handler
5. Handler receives BPMN context via `@BpmnContext()` decorator

### Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { ToastModule } from '@azerothian/toast';
import { ToastBpmnModule } from '@azerothian/toast-bpmn';

@Module({
  imports: [
    ToastModule.forRoot({
      plugins: [],
      tracing: { enabled: true },
    }),

    ToastBpmnModule.forRoot({
      // BPMN file location
      bpmnPath: './workflows',

      // Validation
      validateOnLoad: true,
      strictTypeChecking: true,

      // Processing
      processingMode: 'distributed',
      executionType: 'async',

      // Distributed config
      distributed: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        queues: {
          default: { concurrency: 10 },
          priority: { concurrency: 5 },
        },
      },

      // Context storage
      context: {
        storage: 'redis',
        ttl: 86400,
      },

      // Debugging
      timing: { enabled: true },
      debugging: {
        captureStacktraces: true,
        stacktraceDepth: 15,
      },

      // Type discovery
      typeDiscovery: {
        paths: ['./src/**/*.types.ts'],
        strict: true,
      },
    }),
  ],
})
export class AppModule {}
```

---

## Examples

### Basic Workflow

A simple inline workflow for order validation.

```typescript
// types/order.types.ts
import { RegisterType } from '@azerothian/toast-bpmn';

@RegisterType()
export interface OrderInput {
  orderId: string;
  items: OrderItem[];
  customerId: string;
}

@RegisterType()
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@RegisterType()
export interface OrderOutput {
  orderId: string;
  status: 'approved' | 'rejected';
  message: string;
}

// context/order.context.ts
export interface OrderContext extends BaseBpmnContext {
  order: OrderInput;
  validationResult?: ValidationResult;
}

// processes/order-validation.process.ts
@BpmnProcess<OrderContext, OrderInput, OrderOutput>({
  name: 'order-validation',
  bpmnFile: 'order-validation.bpmn',
  executionType: 'sync',
  processingMode: 'inline',
})
export class OrderValidationProcess {}

// tasks/order.tasks.ts
@Injectable()
export class OrderTasks {
  @BpmnTask({ taskId: 'Task_Validate', inputType: 'OrderInput', outputType: 'ValidationResult' })
  @OnChainEvent<ValidationResult, [OrderContext]>('order.validate')
  async validate(
    input: OrderInput,
    @BpmnContext() ctx: OrderContext,
  ): Promise<ValidationResult> {
    ctx.order = input;
    const valid = input.items.length > 0;
    return { valid, errors: valid ? [] : ['No items'] };
  }

  @BpmnTask({ taskId: 'Task_Approve', inputType: 'ValidationResult', outputType: 'OrderOutput' })
  @OnChainEvent<OrderOutput, [OrderContext]>('order.approve')
  async approve(
    validation: ValidationResult,
    @BpmnContext() ctx: OrderContext,
  ): Promise<OrderOutput> {
    ctx.validationResult = validation;
    return {
      orderId: ctx.order.orderId,
      status: validation.valid ? 'approved' : 'rejected',
      message: validation.valid ? 'Order approved' : validation.errors.join(', '),
    };
  }
}
```

### Distributed Workflow

A distributed workflow for order fulfillment with BullMQ workers.

```typescript
// processes/order-fulfillment.process.ts
@BpmnProcess<OrderFulfillmentContext, OrderInput, FulfillmentOutput>({
  name: 'order-fulfillment',
  bpmnFile: 'order-fulfillment.bpmn',
  executionType: 'async',
  processingMode: 'distributed',
})
export class OrderFulfillmentProcess {
  @OnProcessStart()
  async onStart(ctx: OrderFulfillmentContext) {
    console.log(`Starting fulfillment for order ${ctx.variables.orderId}`);
  }

  @OnProcessComplete()
  async onComplete(ctx: OrderFulfillmentContext, output: FulfillmentOutput) {
    await this.notificationService.send(
      ctx.variables.customerId,
      `Order ${output.orderId} shipped! Tracking: ${output.trackingNumber}`,
    );
  }
}

// workers/fulfillment.worker.ts
@Injectable()
export class FulfillmentWorker {
  @BpmnTask({ taskId: 'Task_ReserveInventory' })
  @OnChainEvent<InventoryResult, [OrderFulfillmentContext]>('inventory.reserve')
  async reserveInventory(
    input: InventoryRequest,
    @BpmnContext() ctx: OrderFulfillmentContext,
  ): Promise<InventoryResult> {
    // Long-running inventory operation
    const result = await this.inventoryService.reserve(input.items);
    return result;
  }

  @BpmnTask({ taskId: 'Task_ProcessPayment' })
  @OnChainEvent<PaymentResult, [OrderFulfillmentContext]>('payment.process')
  async processPayment(
    input: PaymentRequest,
    @BpmnContext() ctx: OrderFulfillmentContext,
  ): Promise<PaymentResult> {
    // External payment gateway call
    const result = await this.paymentGateway.charge(input);
    return result;
  }

  @BpmnTask({ taskId: 'Task_CreateShipment' })
  @OnChainEvent<ShipmentResult, [OrderFulfillmentContext]>('shipping.create')
  async createShipment(
    input: ShipmentRequest,
    @BpmnContext() ctx: OrderFulfillmentContext,
  ): Promise<ShipmentResult> {
    // Shipping provider integration
    const result = await this.shippingProvider.createLabel(input);
    return result;
  }
}
```

### Complex Multi-Step Process

A complex workflow with gateways and parallel execution.

```typescript
// Complex BPMN with exclusive gateway
@BpmnProcess({
  name: 'loan-application',
  bpmnFile: 'loan-application.bpmn',
  executionType: 'async',
  processingMode: 'distributed',
})
export class LoanApplicationProcess {}

@Injectable()
export class LoanTasks {
  // Initial credit check
  @BpmnTask({ taskId: 'Task_CreditCheck' })
  @OnChainEvent<CreditResult>('loan.creditCheck')
  async creditCheck(input: LoanApplication): Promise<CreditResult> {
    return this.creditService.check(input.applicantId);
  }

  // Gateway condition handlers
  @BpmnTask({ taskId: 'Task_AutoApprove' })
  @OnChainEvent<LoanDecision, [LoanContext]>('loan.autoApprove')
  async autoApprove(input: CreditResult, @BpmnContext() ctx: LoanContext): Promise<LoanDecision> {
    return { approved: true, reason: 'Auto-approved based on credit score' };
  }

  @BpmnTask({ taskId: 'Task_ManualReview' })
  @OnChainEvent<LoanDecision, [LoanContext]>('loan.manualReview')
  async manualReview(input: CreditResult, @BpmnContext() ctx: LoanContext): Promise<LoanDecision> {
    // Create manual review task
    const reviewId = await this.reviewService.create(ctx);
    return { approved: false, pending: true, reviewId };
  }

  @BpmnTask({ taskId: 'Task_Reject' })
  @OnChainEvent<LoanDecision, [LoanContext]>('loan.reject')
  async reject(input: CreditResult, @BpmnContext() ctx: LoanContext): Promise<LoanDecision> {
    return { approved: false, reason: 'Credit score below threshold' };
  }
}
```

---

## API Reference

### Decorators

| Decorator | Parameters | Description |
|-----------|------------|-------------|
| `@BpmnProcess<C, I, O>` | `BpmnProcessOptions` | Define a BPMN process class |
| `@BpmnTask` | `BpmnTaskOptions` | Map method to BPMN task |
| `@BpmnContext()` | - | Inject BPMN context into handler |
| `@RegisterType()` | `RegisterTypeOptions?` | Register type for validation |
| `@OnProcessStart()` | - | Hook for process start |
| `@OnProcessComplete()` | - | Hook for process completion |
| `@OnProcessError()` | - | Hook for process errors |
| `@ManualTrigger(name)` | `string` | Define manual trigger method |
| `@TimerTrigger(opts)` | `TimerTriggerOptions` | Define scheduled trigger |

### Services

| Service | Description |
|---------|-------------|
| `BpmnLoaderService` | Load and parse BPMN files |
| `BpmnExecutorService` | Execute BPMN processes |
| `BpmnContextService` | Manage process context |
| `BpmnTypeRegistryService` | Type registration and validation |
| `BpmnValidatorService` | BPMN file validation |

### Module Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bpmnPath` | `string` | `'./workflows'` | Base path for BPMN files |
| `validateOnLoad` | `boolean` | `true` | Validate files on load |
| `strictTypeChecking` | `boolean` | `true` | Require all types to exist |
| `processingMode` | `'inline' \| 'distributed'` | `'inline'` | Default processing mode |
| `executionType` | `'sync' \| 'async'` | `'sync'` | Default execution type |
| `distributed` | `DistributedConfig` | - | BullMQ/Redis configuration |
| `context` | `ContextConfig` | - | Context storage configuration |
| `timing` | `TimingConfig` | - | Timing capture configuration |
| `debugging` | `DebuggingConfig` | - | Debug options |
| `typeDiscovery` | `TypeDiscoveryConfig` | - | Type auto-discovery |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `bpmn.process.started` | `ProcessStartedEvent` | Process execution started |
| `bpmn.process.completed` | `ProcessCompletedEvent` | Process execution completed |
| `bpmn.process.failed` | `ProcessFailedEvent` | Process execution failed |
| `bpmn.task.started` | `TaskStartedEvent` | Task execution started |
| `bpmn.task.completed` | `TaskCompletedEvent` | Task execution completed |
| `bpmn.task.failed` | `TaskFailedEvent` | Task execution failed |
| `bpmn.context.serialize` | `ContextSerializeEvent` | Context serialization |
| `bpmn.context.deserialize` | `ContextDeserializeEvent` | Context deserialization |

---

## Summary

@azerothian/toast-bpmn extends @azerothian/toast with visual workflow orchestration:

- **BPMN 2.0 Support**: Parse and execute standard BPMN workflows via bpmn-moddle
- **Type Safety**: All connections validated against TypeScript types at load time
- **Flexible Execution**: Choose inline (fast) or distributed (scalable) processing
- **Sync/Async Modes**: Immediate responses or background processing with tracking
- **Context Management**: Automatic state tracking with optional Redis persistence
- **Toast Integration**: Seamless integration with existing @OnChainEvent handlers
- **Debugging**: Built-in timing and stacktrace capture for all execution modes
- **Validation**: Custom XSD schema ensures BPMN files are valid before execution

The library enables visual workflow design while maintaining the type safety and developer experience of the toast framework.
