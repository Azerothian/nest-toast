import 'reflect-metadata';
import {
  OnProcessStart,
  OnProcessComplete,
  OnProcessError,
} from '../../../decorators/lifecycle.decorators';
import {
  BPMN_LIFECYCLE_START_KEY,
  BPMN_LIFECYCLE_COMPLETE_KEY,
  BPMN_LIFECYCLE_ERROR_KEY,
} from '../../../constants';

describe('Lifecycle decorators', () => {
  describe('OnProcessStart', () => {
    it('should store the method name on the constructor', () => {
      class MyProcess {
        @OnProcessStart()
        onStart() {}
      }

      const methodName = Reflect.getMetadata(BPMN_LIFECYCLE_START_KEY, MyProcess);
      expect(methodName).toBe('onStart');
    });

    it('should return the original descriptor', () => {
      class MyProcess {
        @OnProcessStart()
        onStart() {
          return 'started';
        }
      }

      expect(new MyProcess().onStart()).toBe('started');
    });
  });

  describe('OnProcessComplete', () => {
    it('should store the method name on the constructor', () => {
      class MyProcess {
        @OnProcessComplete()
        onComplete() {}
      }

      const methodName = Reflect.getMetadata(BPMN_LIFECYCLE_COMPLETE_KEY, MyProcess);
      expect(methodName).toBe('onComplete');
    });
  });

  describe('OnProcessError', () => {
    it('should store the method name on the constructor', () => {
      class MyProcess {
        @OnProcessError()
        onError() {}
      }

      const methodName = Reflect.getMetadata(BPMN_LIFECYCLE_ERROR_KEY, MyProcess);
      expect(methodName).toBe('onError');
    });
  });

  it('should store all three lifecycle methods on the same class', () => {
    class FullProcess {
      @OnProcessStart()
      handleStart() {}

      @OnProcessComplete()
      handleComplete() {}

      @OnProcessError()
      handleError() {}
    }

    expect(Reflect.getMetadata(BPMN_LIFECYCLE_START_KEY, FullProcess)).toBe('handleStart');
    expect(Reflect.getMetadata(BPMN_LIFECYCLE_COMPLETE_KEY, FullProcess)).toBe('handleComplete');
    expect(Reflect.getMetadata(BPMN_LIFECYCLE_ERROR_KEY, FullProcess)).toBe('handleError');
  });
});
