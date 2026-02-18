import { getToastGroups } from './properties';

class ToastPropertiesProvider {
  private _propertiesPanel: any;

  static $inject = ['propertiesPanel', 'injector'];

  constructor(propertiesPanel: any, _injector: any) {
    this._propertiesPanel = propertiesPanel;
    propertiesPanel.registerProvider(500, this);
  }

  getGroups(element: any) {
    return (groups: any[]) => {
      const toastGroups = getToastGroups(element);
      return [...groups, ...toastGroups];
    };
  }
}

const toastPropertiesProviderModule = {
  __init__: ['toastPropertiesProvider'],
  toastPropertiesProvider: ['type', ToastPropertiesProvider],
};

export default toastPropertiesProviderModule;
export { toastPropertiesProviderModule, ToastPropertiesProvider };
