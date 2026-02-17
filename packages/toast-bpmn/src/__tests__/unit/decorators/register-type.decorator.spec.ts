import 'reflect-metadata';
import { RegisterType, RegisterTypeMetadata } from '../../../decorators/register-type.decorator';
import { BPMN_TYPE_METADATA_KEY } from '../../../constants';

describe('RegisterType decorator', () => {
  it('should use class name as default name when no options provided', () => {
    @RegisterType()
    class OrderData {}

    const metadata: RegisterTypeMetadata = Reflect.getMetadata(BPMN_TYPE_METADATA_KEY, OrderData);
    expect(metadata.name).toBe('OrderData');
  });

  it('should use custom name when provided', () => {
    @RegisterType({ name: 'CustomOrderType' })
    class OrderData {}

    const metadata: RegisterTypeMetadata = Reflect.getMetadata(BPMN_TYPE_METADATA_KEY, OrderData);
    expect(metadata.name).toBe('CustomOrderType');
  });

  it('should store schema when provided', () => {
    const schema = { type: 'object', properties: { id: { type: 'string' } } };

    @RegisterType({ schema })
    class ProductData {}

    const metadata: RegisterTypeMetadata = Reflect.getMetadata(BPMN_TYPE_METADATA_KEY, ProductData);
    expect(metadata.schema).toEqual(schema);
  });

  it('should have undefined schema when not provided', () => {
    @RegisterType()
    class SimpleData {}

    const metadata: RegisterTypeMetadata = Reflect.getMetadata(BPMN_TYPE_METADATA_KEY, SimpleData);
    expect(metadata.schema).toBeUndefined();
  });

  it('should not leak metadata between classes', () => {
    @RegisterType({ name: 'TypeA' })
    class DataA {}

    @RegisterType({ name: 'TypeB' })
    class DataB {}

    expect(Reflect.getMetadata(BPMN_TYPE_METADATA_KEY, DataA).name).toBe('TypeA');
    expect(Reflect.getMetadata(BPMN_TYPE_METADATA_KEY, DataB).name).toBe('TypeB');
  });
});
