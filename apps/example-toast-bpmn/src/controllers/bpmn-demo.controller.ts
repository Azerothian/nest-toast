import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  BpmnLoaderService,
  BpmnExecutorService,
  BpmnContextService,
} from '@azerothian/toast-bpmn';

@Controller('bpmn')
export class BpmnDemoController {
  constructor(
    private readonly loader: BpmnLoaderService,
    private readonly executor: BpmnExecutorService,
    private readonly contextService: BpmnContextService,
  ) {}

  @Get('processes')
  listProcesses() {
    const definitions = this.loader.getAllDefinitions();
    return definitions.map((d) => ({
      name: d.name,
      description: d.description,
      version: d.version,
      tasks: d.tasks.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        chainEventName: t.chainEventName,
      })),
    }));
  }

  @Post('execute/:processName')
  async execute(
    @Param('processName') processName: string,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.executor.execute(processName, body);
    return { success: true, result };
  }

  @Post('execute-async/:processName')
  async executeAsync(
    @Param('processName') processName: string,
    @Body() body: Record<string, unknown>,
  ) {
    const asyncResult = await this.executor.executeAsync(processName, body);
    return asyncResult;
  }

  @Get('status/:processId')
  async getStatus(@Param('processId') processId: string) {
    const status = await this.executor.getStatus(processId);
    return { processId, status: status ?? 'not_found' };
  }

  @Get('context/:processId')
  async getContext(@Param('processId') processId: string) {
    const context = await this.contextService.get(processId);
    if (!context) {
      return { processId, error: 'Context not found' };
    }
    return context;
  }
}
