import 'reflect-metadata';
import { CHAIN_EVENT_METADATA_KEY, CHAIN_EVENT_HANDLERS_KEY } from '../constants';

export interface ChainEventHandlerRecord {
  eventName: string;
  methodName: string;
}

export function OnChainEvent(eventName: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
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
  };
}
