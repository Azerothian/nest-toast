import 'reflect-metadata';
import { CHAIN_EVENT_METADATA_KEY, CHAIN_EVENT_HANDLERS_KEY } from '../constants';

export interface ChainEventHandlerRecord {
  eventName: string;
  methodName: string;
}

/**
 * Marks a method as a ChainEvent handler with compile-time type safety.
 *
 * @typeParam TReturn - The type of the return value (and chain input)
 * @typeParam TArgs - Tuple type for initial arguments that remain constant through the chain
 *
 * @param eventName - The event name to listen for. Supports glob patterns like 'order:**'
 *
 * Chain flow:
 * ```
 * (initial, arg1, arg2) → handler1(initial, arg1, arg2) → result1
 *                       → handler2(result1, arg1, arg2) → result2
 *                       → handler3(result2, arg1, arg2) → final
 * ```
 *
 * @example
 * // Basic handler (backward compatible - no extra args)
 * @OnChainEvent<Order>('order:validate')
 * async validateOrder(order: Order): Promise<Order> {
 *   return order;
 * }
 *
 * @example
 * // Handler with initial args that stay constant through the chain
 * @OnChainEvent<Order, [OrderContext, OrderOptions]>('order:process')
 * async processOrder(
 *   order: Order,           // Return value from previous handler
 *   context: OrderContext,  // Initial arg - stays constant
 *   options: OrderOptions   // Initial arg - stays constant
 * ): Promise<Order> {
 *   return { ...order, processedBy: context.userId };
 * }
 *
 * @example
 * // Pre-constrained decorator factory for reusability
 * const OnOrderProcess = (eventName: string) =>
 *   OnChainEvent<ProcessedOrder, [OrderContext]>(eventName);
 *
 * @OnOrderProcess('order:process')
 * async process(order: OrderData, context: OrderContext): Promise<ProcessedOrder> {
 *   return { ...order, processed: true, processedAt: new Date() };
 * }
 */
export function OnChainEvent<TReturn, TArgs extends unknown[] = []>(
  eventName: string,
): <T extends (returnVal: TReturn, ...initialArgs: TArgs) => TReturn | Promise<TReturn>>(
  target: Object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void {
  return <T extends (returnVal: TReturn, ...initialArgs: TArgs) => TReturn | Promise<TReturn>>(
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
