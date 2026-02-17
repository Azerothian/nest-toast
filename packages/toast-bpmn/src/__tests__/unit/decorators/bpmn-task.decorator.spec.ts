import 'reflect-metadata';
import { BpmnTask, BpmnTaskOptions, BpmnTaskHandlerRecord } from '../../../decorators/bpmn-task.decorator';
import { BPMN_TASK_METADATA_KEY, BPMN_TASK_HANDLERS_KEY } from '../../../constants';

describe('BpmnTask decorator', () => {
  it('should set per-method metadata', () => {
    const options: BpmnTaskOptions = { taskId: 'validate-order', type: 'serviceTask' };

    class OrderProcess {
      @BpmnTask(options)
      validateOrder() {}
    }

    const metadata = Reflect.getMetadata(
      BPMN_TASK_METADATA_KEY,
      OrderProcess.prototype,
      'validateOrder',
    );
    expect(metadata).toEqual(options);
  });

  it('should add entry to per-class handlers array', () => {
    class ShipmentProcess {
      @BpmnTask({ taskId: 'ship-item', type: 'serviceTask' })
      shipItem() {}
    }

    const handlers: BpmnTaskHandlerRecord[] = Reflect.getMetadata(
      BPMN_TASK_HANDLERS_KEY,
      ShipmentProcess,
    );
    expect(handlers).toHaveLength(1);
    expect(handlers[0]).toEqual({
      taskId: 'ship-item',
      methodName: 'shipItem',
      type: 'serviceTask',
    });
  });

  it('should accumulate multiple tasks on the same class', () => {
    class MultiTaskProcess {
      @BpmnTask({ taskId: 'task-a', type: 'serviceTask' })
      taskA() {}

      @BpmnTask({ taskId: 'task-b', type: 'userTask' })
      taskB() {}

      @BpmnTask({ taskId: 'task-c', type: 'scriptTask' })
      taskC() {}
    }

    const handlers: BpmnTaskHandlerRecord[] = Reflect.getMetadata(
      BPMN_TASK_HANDLERS_KEY,
      MultiTaskProcess,
    );
    expect(handlers).toHaveLength(3);
    expect(handlers.map((h) => h.taskId)).toEqual(['task-a', 'task-b', 'task-c']);
  });

  it('should default type to serviceTask when not specified', () => {
    class DefaultTypeProcess {
      @BpmnTask({ taskId: 'my-task' })
      myTask() {}
    }

    const handlers: BpmnTaskHandlerRecord[] = Reflect.getMetadata(
      BPMN_TASK_HANDLERS_KEY,
      DefaultTypeProcess,
    );
    expect(handlers[0].type).toBe('serviceTask');
  });

  it('should not share handlers array between different classes', () => {
    class ProcessX {
      @BpmnTask({ taskId: 'task-x' })
      doX() {}
    }

    class ProcessY {
      @BpmnTask({ taskId: 'task-y' })
      doY() {}
    }

    const handlersX: BpmnTaskHandlerRecord[] = Reflect.getMetadata(BPMN_TASK_HANDLERS_KEY, ProcessX);
    const handlersY: BpmnTaskHandlerRecord[] = Reflect.getMetadata(BPMN_TASK_HANDLERS_KEY, ProcessY);

    expect(handlersX).toHaveLength(1);
    expect(handlersX[0].taskId).toBe('task-x');
    expect(handlersY).toHaveLength(1);
    expect(handlersY[0].taskId).toBe('task-y');
  });

  it('should store description and timeout in per-method metadata', () => {
    class TimedProcess {
      @BpmnTask({ taskId: 'slow-task', description: 'A slow task', timeout: 5000 })
      slowTask() {}
    }

    const metadata: BpmnTaskOptions = Reflect.getMetadata(
      BPMN_TASK_METADATA_KEY,
      TimedProcess.prototype,
      'slowTask',
    );
    expect(metadata.description).toBe('A slow task');
    expect(metadata.timeout).toBe(5000);
  });
});
