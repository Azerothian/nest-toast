import { Injectable, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { BPMN_TYPE_METADATA_KEY, TOAST_BPMN_MODULE_OPTIONS } from '../constants';
import type { ToastBpmnModuleOptions } from '../interfaces/bpmn-module-options.interface';

interface TypeRegistryEntry {
  name: string;
  schema?: Record<string, unknown>;
  constructor?: Function;
}

@Injectable()
export class BpmnTypeRegistryService implements OnModuleInit {
  private readonly types = new Map<string, TypeRegistryEntry>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    @Inject(TOAST_BPMN_MODULE_OPTIONS) @Optional() private readonly options?: ToastBpmnModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.options?.typeDiscovery?.enabled !== false) {
      this.discoverTypes();
    }
  }

  private discoverTypes(): void {
    const providers = this.discoveryService.getProviders();
    for (const wrapper of providers) {
      const instance = wrapper.instance;
      if (!instance || typeof instance !== 'object') continue;
      const constructor = Object.getPrototypeOf(instance)?.constructor;
      if (!constructor) continue;
      const metadata = Reflect.getMetadata(BPMN_TYPE_METADATA_KEY, constructor);
      if (!metadata) continue;
      this.types.set(metadata.name, {
        name: metadata.name,
        schema: metadata.schema,
        constructor,
      });
    }
  }

  register(name: string, schema?: Record<string, unknown>): void {
    this.types.set(name, { name, schema });
  }

  validate(name: string, data: unknown): { valid: boolean; errors: string[] } {
    const entry = this.types.get(name);
    if (!entry) return { valid: false, errors: [`Type "${name}" not registered`] };
    if (!entry.schema) return { valid: true, errors: [] };
    // Basic schema validation - check required properties exist
    const errors: string[] = [];
    if (typeof data !== 'object' || data === null) {
      return { valid: false, errors: [`Expected object for type "${name}"`] };
    }
    const obj = data as Record<string, unknown>;
    for (const [key, constraint] of Object.entries(entry.schema)) {
      if (typeof constraint === 'object' && constraint !== null) {
        const c = constraint as { type?: string; required?: boolean };
        if (c.required && !(key in obj)) {
          errors.push(`Missing required property "${key}" for type "${name}"`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  getSchema(name: string): Record<string, unknown> | undefined {
    return this.types.get(name)?.schema;
  }

  getType(name: string): TypeRegistryEntry | undefined {
    return this.types.get(name);
  }

  hasType(name: string): boolean {
    return this.types.has(name);
  }

  getAllTypes(): string[] {
    return Array.from(this.types.keys());
  }
}
