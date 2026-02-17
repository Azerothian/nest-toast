import 'reflect-metadata';
import { CHAIN_EVENT_METADATA_KEY, CHAIN_EVENT_HANDLERS_KEY } from '../constants';

export interface ChainEventHandlerRecord {
  eventName: string;
  methodName: string;
}

/**
 * Marks a method as a ChainEvent handler with compile-time type safety.
 *
 * @typeParam TData - The type of the input data (required)
 * @typeParam TReturn - The type of the return value (defaults to TData)
 *
 * @param eventName - The event name to listen for. Supports glob patterns like 'order:**'
 *
 * @example
 * // Same input/output type (TReturn defaults to TData)
 * @OnChainEvent<Order>('order:validate')
 * async validateOrder(order: Order): Promise<Order> {
 *   return order;
 * }
 *
 * @example
 * // Different input/output types
 * @OnChainEvent<Order, ProcessedOrder>('order:process')
 * async processOrder(order: Order): Promise<ProcessedOrder> {
 *   return { ...order, processed: true };
 * }
 *
 * @example
 * // Pre-constrained decorator factory for reusability
 * const OnOrderProcess = (eventName: string) =>
 *   OnChainEvent<OrderData, ProcessedOrder>(eventName);
 *
 * @OnOrderProcess('order:process')
 * async process(order: OrderData): Promise<ProcessedOrder> {
 *   return { ...order, processed: true, processedAt: new Date() };
 * }
 */
export function OnChainEvent<TData, TReturn = TData>(
  eventName: string,
): <T extends (data: TData) => TReturn | Promise<TReturn>>(
  target: Object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void {
  return <T extends (data: TData) => TReturn | Promise<TReturn>>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> | void => {
    // Per-method storage
    Reflect.defineMetadata(CHAIN_EVENT_METADATA_KEY, eventName, target, propertyKey);

    // Per-class array storage for efficient discovery
    const constructor = (target as { constructor: Function }).constructor;
    const existingHandlers: ChainEventHandlerRecord[] =
      Reflect.getMetadata(CHAIN_EVENT_HANDLERS_KEY, constructor) ?? [];
    existingHandlers.push({
      eventName,
      methodName: propertyKey as string,
    });
    Reflect.defineMetadata(CHAIN_EVENT_HANDLERS_KEY, existingHandlers, constructor);

    return descriptor;
  };
}
