import { Injectable } from '@nestjs/common';
import { Plugin, OnChainEvent } from '@azerothian/toast';

@Plugin({
  name: 'logger',
  version: '1.0.0',
  tags: ['core', 'logging'],
})
@Injectable()
export class LoggerPlugin {
  @OnChainEvent('order:created')
  async logOrderCreated(data: { orderId: string; customerId: string }) {
    console.log(`[Logger] Order created: ${data.orderId} for customer ${data.customerId}`);
    return data;
  }

  @OnChainEvent('order:processed')
  async logOrderProcessed(data: { orderId: string; status: string }) {
    console.log(`[Logger] Order processed: ${data.orderId} with status ${data.status}`);
    return data;
  }

  log(message: string, context?: string) {
    const prefix = context ? `[${context}]` : '';
    console.log(`${prefix} ${message}`);
  }
}
