import { Injectable } from '@nestjs/common';
import { Plugin, OnChainEvent } from '@azerothian/toast';
import type { OrderData } from './validator.plugin';

@Plugin({
  name: 'transformer',
  version: '1.0.0',
  dependencies: ['validator'],
  tags: ['core', 'transformation'],
})
@Injectable()
export class TransformerPlugin {
  @OnChainEvent<OrderData>('order:transform')
  async transformOrder(data: OrderData): Promise<OrderData> {
    console.log('[Transformer] Transforming order...');

    const orderId = data.orderId || `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    console.log(`[Transformer] Generated order ID: ${orderId}, Total: $${total.toFixed(2)}`);

    return {
      ...data,
      orderId,
      total,
    };
  }

  transform<T, R>(data: T, transformer: (input: T) => R): R {
    return transformer(data);
  }
}
