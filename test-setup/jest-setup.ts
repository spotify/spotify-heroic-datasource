// @ts-nocheck
import { JSDOM } from 'jsdom';
import { PanelCtrl } from './panelStub';

jest.mock('angular', () => {
  return {
    module: function () {
      return {
        directive: function () { },
        service: function () { },
        factory: function () { }
      };
    }
  };
}, { virtual: true });

jest.mock('app/core/core_module', () => {
  return {
    interval_to_seconds: function () { },
  };
}, { virtual: true });

let mockPanelCtrl = PanelCtrl;
jest.mock('app/plugins/sdk', () => {
  return {
    QueryCtrl: null,
    loadPluginCss: () => { },
    PanelCtrl: mockPanelCtrl
  };
}, { virtual: true });

jest.mock('app/core/utils/datemath', () => {
  const datemath = require('./modules/datemath');
  return {
    parse: datemath.parse,
    parseDateMath: datemath.parseDateMath,
    isValid: datemath.isValid
  };
}, { virtual: true });

jest.mock('app/core/utils/kbn', () => {
  return {
    round_interval: n => n,
    secondsToHms: n => n + 'ms',
    interval_to_seconds: n => n
  };
}, { virtual: true });

jest.mock('app/core/table_model', () => {
  return class TableModel {
    constructor() {
      this.columns = [];
      this.columnMap = {};
      this.rows = [];
      this.type = 'table';
    }

    addColumn(col) {
      if (!this.columnMap[col.text]) {
        this.columns.push(col);
        this.columnMap[col.text] = col;
      }
    }
  };
}, { virtual: true });

jest.mock('app/core/config', () => {
  return {
    buildInfo: { env: 'development' }
  };
}, { virtual: true });

jest.mock('jquery', () => 'module not found', { virtual: true });

// jest.mock('lodash', () => {
//   return {
//     map: () => { }
//   }
// })

// jest.mock('@ui', () => {
//   return {};
// }, {virtual: true});

// Required for loading angularjs
let dom = new JSDOM('<html><head><script></script></head><body></body></html>');
global.window = dom.window;
global.document = global.window.document;
global.Node = window.Node;