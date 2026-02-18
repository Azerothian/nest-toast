import { Injectable } from '@nestjs/common';
import { BpmnValidationError } from '../errors/bpmn-validation.error';
import type { ValidationErrorDetail, ValidationWarningDetail } from '../errors/bpmn-validation.error';
import type { BpmnProcessDefinition } from '../interfaces/bpmn-process.interface';
import type { ValidationResult } from '../interfaces/bpmn-validation.interface';
import { BpmnTypeRegistryService } from './bpmn-type-registry.service';

@Injectable()
export class BpmnValidatorService {
  constructor(private readonly typeRegistry: BpmnTypeRegistryService) {}

  validate(definition: BpmnProcessDefinition): ValidationResult {
    const errors: ValidationErrorDetail[] = [];
    const warnings: ValidationWarningDetail[] = [];

    this.validateStructure(definition, errors, warnings);
    this.validateTypeConstraints(definition, errors, warnings);
    this.validateFlows(definition, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateOrThrow(definition: BpmnProcessDefinition): void {
    const result = this.validate(definition);
    if (!result.valid) {
      throw new BpmnValidationError(result.errors, result.warnings);
    }
  }

  private validateStructure(
    definition: BpmnProcessDefinition,
    errors: ValidationErrorDetail[],
    warnings: ValidationWarningDetail[],
  ): void {
    if (!definition.name) {
      errors.push({ code: 'STRUCT_001', message: 'Process must have a name' });
    }

    if (definition.startEvents.length === 0) {
      errors.push({ code: 'STRUCT_002', message: 'Process must have at least one start event' });
    }

    if (definition.endEvents.length === 0) {
      errors.push({ code: 'STRUCT_003', message: 'Process must have at least one end event' });
    }

    if (definition.tasks.length === 0) {
      warnings.push({ code: 'STRUCT_W001', message: 'Process has no tasks defined' });
    }

    // Check for duplicate task IDs
    const taskIds = new Set<string>();
    for (const task of definition.tasks) {
      if (taskIds.has(task.id)) {
        errors.push({ code: 'STRUCT_004', message: `Duplicate task ID: ${task.id}`, taskId: task.id });
      }
      taskIds.add(task.id);
    }
  }

  private validateTypeConstraints(
    definition: BpmnProcessDefinition,
    errors: ValidationErrorDetail[],
    warnings: ValidationWarningDetail[],
  ): void {
    for (const task of definition.tasks) {
      if (task.inputType && !this.typeRegistry.hasType(task.inputType)) {
        warnings.push({
          code: 'TYPE_W001',
          message: `Input type "${task.inputType}" not registered in type registry`,
          taskId: task.id,
        });
      }
      if (task.outputType && !this.typeRegistry.hasType(task.outputType)) {
        warnings.push({
          code: 'TYPE_W002',
          message: `Output type "${task.outputType}" not registered in type registry`,
          taskId: task.id,
        });
      }
    }
  }

  private validateFlows(
    definition: BpmnProcessDefinition,
    errors: ValidationErrorDetail[],
    warnings: ValidationWarningDetail[],
  ): void {
    // Collect all element IDs
    const elementIds = new Set<string>();
    for (const se of definition.startEvents) elementIds.add(se.id);
    for (const ee of definition.endEvents) elementIds.add(ee.id);
    for (const t of definition.tasks) elementIds.add(t.id);
    for (const g of definition.gateways) elementIds.add(g.id);

    // Check flows reference valid elements
    for (const flow of definition.flows) {
      if (!elementIds.has(flow.sourceRef)) {
        errors.push({
          code: 'FLOW_001',
          message: `Flow "${flow.id}" references non-existent source: ${flow.sourceRef}`,
        });
      }
      if (!elementIds.has(flow.targetRef)) {
        errors.push({
          code: 'FLOW_002',
          message: `Flow "${flow.id}" references non-existent target: ${flow.targetRef}`,
        });
      }
    }

    // Check tasks have chainEventName
    for (const task of definition.tasks) {
      if (task.type === 'serviceTask' && !task.chainEventName) {
        warnings.push({
          code: 'FLOW_W001',
          message: `Service task "${task.id}" has no chainEventName - it won't be executable`,
          taskId: task.id,
        });
      }
    }
  }
}
