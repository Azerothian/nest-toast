import { Injectable, Logger } from '@nestjs/common';
import { Plugin, OnChainEvent } from '@azerothian/toast';
import { BpmnProcess } from '@azerothian/toast-bpmn';

@BpmnProcess({ name: 'OrderProcess', version: '1.0.0' })
@Plugin({ name: 'OrderProcessHandler', version: '1.0.0' })
@Injectable()
export class OrderProcessHandler {
  private readonly logger = new Logger(OrderProcessHandler.name);

  @OnChainEvent<Record<string, unknown>>('order.validate')
  async validate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger.log(`Validating order: ${JSON.stringify(data)}`);

    const { customerName, items } = data;
    if (!customerName) {
      throw new Error('Customer name is required');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }

    return { ...data, validated: true, validatedAt: new Date().toISOString() };
  }

  @OnChainEvent<Record<string, unknown>>('order.process')
  async process(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger.log(`Processing order for: ${data.customerName}`);

    const items = data.items as Array<{ name: string; quantity: number; price: number }>;
    const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const orderId = `ORD-${Date.now()}`;

    return { ...data, orderId, total, processedAt: new Date().toISOString() };
  }

  @OnChainEvent<Record<string, unknown>>('order.notify')
  async notify(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger.log(
      `Sending notification for order ${data.orderId} to ${data.customerName} (total: $${data.total})`,
    );

    return { ...data, notifiedAt: new Date().toISOString(), notificationSent: true };
  }
}
