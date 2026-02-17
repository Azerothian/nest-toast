import { Injectable, Inject, Optional, OnModuleInit } from '@nestjs/common';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { TOAST_BPMN_MODULE_OPTIONS } from '../constants';
import { BpmnLoaderError } from '../errors/bpmn-loader.error';
import type { ToastBpmnModuleOptions } from '../interfaces/bpmn-module-options.interface';
import type { BpmnProcessDefinition } from '../interfaces/bpmn-process.interface';
import type { BpmnTaskDefinition, BpmnTaskType } from '../interfaces/bpmn-task.interface';
import type { BpmnSequenceFlow, BpmnStartEvent, BpmnEndEvent } from '../interfaces/bpmn-flow.interface';

@Injectable()
export class BpmnLoaderService implements OnModuleInit {
  private readonly definitions = new Map<string, BpmnProcessDefinition>();
  private moddle: any; // BpmnModdle instance - loaded dynamically

  constructor(
    @Inject(TOAST_BPMN_MODULE_OPTIONS) @Optional() private readonly options?: ToastBpmnModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initModdle();
    if (this.options?.bpmnPath) {
      await this.loadDirectory(this.options.bpmnPath);
    }
  }

  private async initModdle(): Promise<void> {
    try {
      const BpmnModdle = (await import('bpmn-moddle')).default;
      // Load toast extension
      let toastExtension: Record<string, unknown> | undefined;
      try {
        // Use dynamic import for the JSON extension descriptor
        toastExtension = (await import('../schema/toast-extension.json', { with: { type: 'json' } })).default;
      } catch {
        // Fallback: try require-style or skip extension
        try {
          const { readFileSync } = await import('fs');
          const { join: joinPath } = await import('path');
          const extensionPath = joinPath(__dirname, '..', 'schema', 'toast-extension.json');
          toastExtension = JSON.parse(readFileSync(extensionPath, 'utf-8'));
        } catch {
          // Continue without extension
        }
      }
      this.moddle = toastExtension
        ? new BpmnModdle({ toast: toastExtension })
        : new BpmnModdle();
    } catch (err) {
      throw new BpmnLoaderError(
        'Failed to initialize bpmn-moddle. Ensure "bpmn-moddle" is installed.',
        undefined,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  async load(filePath: string): Promise<BpmnProcessDefinition> {
    try {
      const xml = await readFile(filePath, 'utf-8');
      return await this.parseXml(xml, filePath);
    } catch (err) {
      if (err instanceof BpmnLoaderError) throw err;
      throw new BpmnLoaderError(
        `Failed to load BPMN file: ${filePath}`,
        filePath,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  async loadFromString(xml: string, sourceName?: string): Promise<BpmnProcessDefinition> {
    return this.parseXml(xml, sourceName);
  }

  async loadDirectory(dirPath: string): Promise<BpmnProcessDefinition[]> {
    try {
      const files = await readdir(dirPath);
      const bpmnFiles = files.filter(f => extname(f).toLowerCase() === '.bpmn');
      const results: BpmnProcessDefinition[] = [];
      for (const file of bpmnFiles) {
        const def = await this.load(join(dirPath, file));
        results.push(def);
      }
      return results;
    } catch (err) {
      if (err instanceof BpmnLoaderError) throw err;
      throw new BpmnLoaderError(
        `Failed to load BPMN directory: ${dirPath}`,
        dirPath,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  async reload(name: string): Promise<BpmnProcessDefinition | undefined> {
    const existing = this.definitions.get(name);
    if (!existing?.source) return undefined;
    const def = await this.load(existing.source);
    return def;
  }

  getDefinition(name: string): BpmnProcessDefinition | undefined {
    return this.definitions.get(name);
  }

  getAllDefinitions(): BpmnProcessDefinition[] {
    return Array.from(this.definitions.values());
  }

  hasDefinition(name: string): boolean {
    return this.definitions.has(name);
  }

  private async parseXml(xml: string, source?: string): Promise<BpmnProcessDefinition> {
    if (!this.moddle) {
      await this.initModdle();
    }

    let result;
    try {
      result = await this.moddle.fromXML(xml);
    } catch (err) {
      throw new BpmnLoaderError(
        `Failed to parse BPMN XML${source ? `: ${source}` : ''}`,
        source,
        err instanceof Error ? err : new Error(String(err)),
      );
    }

    const definitions = result.rootElement;
    if (!definitions?.rootElements?.length) {
      throw new BpmnLoaderError('BPMN file contains no root elements', source);
    }

    // Find process elements
    const processes = definitions.rootElements.filter(
      (el: any) => el.$type === 'bpmn:Process',
    );

    if (processes.length === 0) {
      throw new BpmnLoaderError('BPMN file contains no process definitions', source);
    }

    // Parse the first process (primary)
    const process = processes[0];
    const processName = process.id || process.name || 'unnamed';

    const tasks: BpmnTaskDefinition[] = [];
    const flows: BpmnSequenceFlow[] = [];
    const startEvents: BpmnStartEvent[] = [];
    const endEvents: BpmnEndEvent[] = [];

    // Extract toast:processConfig from extension elements if present
    let processConfig: any = {};
    if (process.extensionElements?.values) {
      for (const ext of process.extensionElements.values) {
        if (ext.$type === 'toast:ProcessConfig') {
          processConfig = ext;
        }
      }
    }

    const flowElements = process.flowElements || [];
    for (const el of flowElements) {
      switch (el.$type) {
        case 'bpmn:StartEvent':
          startEvents.push({
            id: el.id,
            name: el.name,
            outgoing: (el.outgoing || []).map((f: any) => f.id || f),
          });
          break;

        case 'bpmn:EndEvent':
          endEvents.push({
            id: el.id,
            name: el.name,
            incoming: (el.incoming || []).map((f: any) => f.id || f),
          });
          break;

        case 'bpmn:SequenceFlow':
          flows.push({
            id: el.id,
            name: el.name,
            sourceRef: typeof el.sourceRef === 'string' ? el.sourceRef : el.sourceRef?.id,
            targetRef: typeof el.targetRef === 'string' ? el.targetRef : el.targetRef?.id,
            conditionExpression: el.conditionExpression?.body,
          });
          break;

        case 'bpmn:ServiceTask':
        case 'bpmn:UserTask':
        case 'bpmn:ScriptTask':
        case 'bpmn:SendTask':
        case 'bpmn:ReceiveTask':
        case 'bpmn:ManualTask':
        case 'bpmn:BusinessRuleTask':
        case 'bpmn:Task': {
          const taskType = this.mapTaskType(el.$type);
          let taskConfig: any = {};
          if (el.extensionElements?.values) {
            for (const ext of el.extensionElements.values) {
              if (ext.$type === 'toast:TaskConfig') {
                taskConfig = ext;
              }
            }
          }
          tasks.push({
            id: el.id,
            name: el.name || el.id,
            type: taskType,
            chainEventName: taskConfig.chainEventName,
            description: taskConfig.description,
            timeout: taskConfig.timeout,
            inputType: taskConfig.inputType,
            outputType: taskConfig.outputType,
            extensionElements: taskConfig,
          });
          break;
        }
        // Gateways and other elements can be added later
      }
    }

    const definition: BpmnProcessDefinition = {
      name: processName,
      description: processConfig.description || process.name,
      version: processConfig.version,
      retryPolicy: processConfig.retryMaxRetries ? {
        maxRetries: processConfig.retryMaxRetries,
        backoffMs: processConfig.retryBackoffMs,
        backoffMultiplier: processConfig.retryBackoffMultiplier,
      } : undefined,
      tasks,
      flows,
      startEvents,
      endEvents,
      source,
    };

    this.definitions.set(processName, definition);
    return definition;
  }

  private mapTaskType(bpmnType: string): BpmnTaskType {
    const typeMap: Record<string, BpmnTaskType> = {
      'bpmn:ServiceTask': 'serviceTask',
      'bpmn:UserTask': 'userTask',
      'bpmn:ScriptTask': 'scriptTask',
      'bpmn:SendTask': 'sendTask',
      'bpmn:ReceiveTask': 'receiveTask',
      'bpmn:ManualTask': 'manualTask',
      'bpmn:BusinessRuleTask': 'businessRuleTask',
      'bpmn:Task': 'serviceTask',
    };
    return typeMap[bpmnType] ?? 'serviceTask';
  }
}
