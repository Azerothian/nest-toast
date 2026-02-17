import { Injectable } from '@nestjs/common';
import { OnChainEvent, ChainExecutorService } from '@azerothian/toast';
import { LoggerPlugin } from '../plugins/logger.plugin';
import { ValidatorPlugin } from '../plugins/validator.plugin';
import { TransformerPlugin } from '../plugins/transformer.plugin';
import type { OrderData } from '../plugins/validator.plugin';

export interface ProcessedOrder extends OrderData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
}

@Injectable()
export class OrderProcessingWorkflow {
  constructor(
    private readonly chainExecutor: ChainExecutorService,
    private readonly logger: LoggerPlugin,
    private readonly validator: ValidatorPlugin,
    private readonly transformer: TransformerPlugin,
  ) {}

  @OnChainEvent('workflow:order:process')
  async processOrder(data: OrderData): Promise<ProcessedOrder> {
    this.logger.log(`Starting order processing for customer: ${data.customerId}`, 'Workflow');

    const result = await this.chainExecutor.waterfall<ProcessedOrder>(
      { ...data, status: 'pending' },
      [
        async (order) => {
          this.logger.log('Step 1: Validating order', 'Workflow');
          const validated = await this.validator.validateOrder(order);
          return { ...validated, status: 'processing' as const };
        },
        async (order) => {
          this.logger.log('Step 2: Transforming order', 'Workflow');
          const transformed = await this.transformer.transformOrder(order);
          return { ...transformed, status: 'processing' as const };
        },
        async (order) => {
          this.logger.log('Step 3: Finalizing order', 'Workflow');
          return {
            ...order,
            status: 'completed' as const,
            processedAt: new Date(),
          };
        },
      ],
    );

    this.logger.log(`Order processing completed: ${result.orderId}`, 'Workflow');
    return result;
  }
}
