import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ToastModule, OnChainEvent, Plugin } from '@azerothian/toast';
import { ToastBpmnModule } from '../../toast-bpmn.module';
import { BpmnLoaderService } from '../../services/bpmn-loader.service';
import { BpmnExecutorService } from '../../services/bpmn-executor.service';
import { BpmnContextService } from '../../services/bpmn-context.service';
import { BpmnValidatorService } from '../../services/bpmn-validator.service';
import { BpmnExecutionError } from '../../errors/bpmn-execution.error';
import { BpmnValidationError } from '../../errors/bpmn-validation.error';
import { BpmnLoaderError } from '../../errors/bpmn-loader.error';

const FIXTURES_DIR = join(__dirname, '../../../test/fixtures');

// Handler that always throws - used for TC-N-003
@Injectable()
@Plugin({ name: 'failing-handler-service', version: '1.0.0' })
class FailingHandlerService {
  @OnChainEvent<Record<string, unknown>>('failing.handler')
  async handle(_input: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('Handler intentionally failed');
  }
}

describe('Negative Cases: Error Handling', () => {
  let moduleRef: TestingModule;
  let loader: BpmnLoaderService;
  let executor: BpmnExecutorService;
  let contextService: BpmnContextService;
  let validator: BpmnValidatorService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ToastModule.forRoot(), ToastBpmnModule.forRoot()],
      providers: [FailingHandlerService],
    }).compile();

    await moduleRef.init();

    loader = moduleRef.get(BpmnLoaderService);
    executor = moduleRef.get(BpmnExecutorService);
    contextService = moduleRef.get(BpmnContextService);
    validator = moduleRef.get(BpmnValidatorService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('TC-N-001: Execute non-existent process', () => {
    it('throws BpmnExecutionError with "not found" message when process is not loaded', async () => {
      await expect(executor.execute('NonExistentProcess', {})).rejects.toThrow(BpmnExecutionError);
      await expect(executor.execute('NonExistentProcess', {})).rejects.toThrow(/not found/i);
    });
  });

  describe('TC-N-002: Execute process that fails validation', () => {
    it('throws BpmnValidationError when process has no start event', async () => {
      const xml = readFileSync(join(FIXTURES_DIR, 'invalid-no-start.bpmn'), 'utf-8');
      await loader.loadFromString(xml);

      await expect(executor.execute('InvalidNoStart', {})).rejects.toThrow(BpmnValidationError);
    });
  });

  describe('TC-N-003: Execute process where handler throws', () => {
    it('throws BpmnExecutionError wrapping the original handler error', async () => {
      const xml = readFileSync(join(FIXTURES_DIR, 'failing-handler.bpmn'), 'utf-8');
      await loader.loadFromString(xml);

      let thrownError: unknown;
      try {
        await executor.execute('FailingProcess', { data: 'test' });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(BpmnExecutionError);
      const execError = thrownError as BpmnExecutionError;
      expect(execError.originalError).toBeDefined();
      expect(execError.originalError!.message).toBe('Handler intentionally failed');
    });
  });

  describe('TC-N-004: Load invalid XML', () => {
    it('throws BpmnLoaderError when XML is not valid BPMN', async () => {
      const invalidXml = '<not-bpmn><garbage /></not-bpmn>';
      await expect(loader.loadFromString(invalidXml)).rejects.toThrow(BpmnLoaderError);
    });
  });

  describe('TC-N-005: Load XML with no process elements', () => {
    it('throws BpmnLoaderError with "no process definitions" when XML has no processes', async () => {
      const noProcessXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  id="Definitions_Empty"
                  targetNamespace="http://example.com/empty">
</bpmn:definitions>`;
      await expect(loader.loadFromString(noProcessXml)).rejects.toThrow(BpmnLoaderError);
      await expect(loader.loadFromString(noProcessXml)).rejects.toThrow(/no root elements|no process definitions/i);
    });
  });

  describe('TC-N-006: Load empty/malformed XML', () => {
    it('throws BpmnLoaderError for empty string', async () => {
      await expect(loader.loadFromString('')).rejects.toThrow(BpmnLoaderError);
    });

    it('throws BpmnLoaderError for malformed XML', async () => {
      const malformed = '<?xml version="1.0"?><unclosed>';
      await expect(loader.loadFromString(malformed)).rejects.toThrow(BpmnLoaderError);
    });
  });

  describe('TC-N-007: Get status of non-existent process', () => {
    it('returns undefined for an unknown processId', async () => {
      const status = await executor.getStatus('non-existent-process-id-00000');
      expect(status).toBeUndefined();
    });
  });

  describe('TC-N-008: Cancel non-existent process', () => {
    it('returns false when cancelling an unknown processId', async () => {
      const result = await executor.cancel('non-existent-process-id-00000');
      expect(result).toBe(false);
    });
  });

  describe('TC-N-009: Get non-existent context', () => {
    it('returns undefined for an unknown processId', async () => {
      const ctx = await contextService.get('non-existent-context-id-00000');
      expect(ctx).toBeUndefined();
    });
  });

  describe('TC-N-010: Validate empty process', () => {
    it('returns errors for a process with no tasks, events, or flows', () => {
      const definition = {
        name: 'EmptyProcess',
        tasks: [],
        flows: [],
        startEvents: [],
        endEvents: [],
        gateways: [],
      };
      const result = validator.validate(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
