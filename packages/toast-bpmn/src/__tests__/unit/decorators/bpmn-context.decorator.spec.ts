import 'reflect-metadata';
import { BpmnContext } from '../../../decorators/bpmn-context.decorator';
import { BPMN_CONTEXT_METADATA_KEY } from '../../../constants';

describe('BpmnContext decorator', () => {
  it('should store the parameter index on the method', () => {
    class MyProcess {
      handleTask(@BpmnContext() ctx: unknown, input: unknown) {}
    }

    const index = Reflect.getMetadata(
      BPMN_CONTEXT_METADATA_KEY,
      MyProcess.prototype,
      'handleTask',
    );
    expect(index).toBe(0);
  });

  it('should store the correct index when context is not the first parameter', () => {
    class MyProcess {
      handleTask(input: unknown, @BpmnContext() ctx: unknown) {}
    }

    const index = Reflect.getMetadata(
      BPMN_CONTEXT_METADATA_KEY,
      MyProcess.prototype,
      'handleTask',
    );
    expect(index).toBe(1);
  });

  it('should store the correct index for the third parameter', () => {
    class MyProcess {
      handleTask(a: unknown, b: unknown, @BpmnContext() ctx: unknown) {}
    }

    const index = Reflect.getMetadata(
      BPMN_CONTEXT_METADATA_KEY,
      MyProcess.prototype,
      'handleTask',
    );
    expect(index).toBe(2);
  });

  it('should not set metadata when propertyKey is undefined', () => {
    // Simulate constructor parameter decoration (propertyKey = undefined)
    const decorator = BpmnContext();
    // Should not throw
    expect(() => {
      decorator({} as Object, undefined as any, 0);
    }).not.toThrow();
  });
});
