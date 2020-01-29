export let templateSrvMock = {
  replace: jest.fn().mockImplementation(query => query),
  replaceWithText: jest.fn(n => n),
  getAdhocFilters: jest.fn().mockReturnValue([])
};

export let backendSrvMock = {
  datasourceRequest: jest.fn()
};

export let datasourceSrvMock = {
  loadDatasource: jest.fn(),
  getAll: jest.fn()
};

export let timeSrvMock = {
  timeRange: jest.fn().mockReturnValue({ from: '', to: '' })
};

export let uiSegmentSrvMock = {
  newPlusButton: jest.fn(),
  newSegment: jest.fn()
};

const defaultExports = {
  templateSrvMock,
  backendSrvMock,
  datasourceSrvMock,
  timeSrvMock,
};

export default defaultExports;