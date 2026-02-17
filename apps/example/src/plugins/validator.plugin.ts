import { Injectable } from '@nestjs/common';
import { Plugin, OnChainEvent } from '@azerothian/toast';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderData {
  orderId?: string;
  customerId: string;
  items: OrderItem[];
  validated?: boolean;
  total?: number;
}

@Plugin({
  name: 'validator',
  version: '1.0.0',
  dependencies: ['logger'],
  tags: ['core', 'validation'],
})
@Injectable()
export class ValidatorPlugin {
  @OnChainEvent('order:validate')
  async validateOrder(data: OrderData): Promise<OrderData> {
    console.log('[Validator] Validating order...');

    if (!data.customerId) {
      throw new Error('Customer ID is required');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for item: ${item.name}`);
      }
      if (item.price < 0) {
        throw new Error(`Invalid price for item: ${item.name}`);
      }
    }

    console.log('[Validator] Order is valid');
    return { ...data, validated: true };
  }

  validate<T>(data: T, rules: Record<string, (value: unknown) => boolean>): boolean {
    for (const [field, rule] of Object.entries(rules)) {
      if (!rule((data as Record<string, unknown>)[field])) {
        return false;
      }
    }
    return true;
  }
}
