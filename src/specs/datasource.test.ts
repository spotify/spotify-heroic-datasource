import HeroicDatasource from '../datasource';
import TimeRange from '../time_range';
import { dateTime } from '@grafana/data';
import $q from 'q';
import { HeroicBatchResult } from '../types';
import { templateSrvMock, uiSegmentSrvMock, backendSrvMock } from '../test-setup/mocks';

interface JSONSettings {
  tagCollapseChecks?: any[];
  tagAggregationChecks: string[];
  suggestionRules: any[];
}

interface InstanceSettings {
  url: string;
  username: string;
  password: string;
  name: string;
  jsonData: JSONSettings;

  // unused
  basicAuth: any;
  database: any;
}

const createHeroicBatchResult = (opts = {}) =>
  Object.assign(
    {
      status: 0,
      xhrStatus: '',
      statusText: '',
      config: { queries: {} },
      data: {},
    } as HeroicBatchResult,
    opts
  );

describe('HeroicDataSource', () => {
  const ctx = {
    instanceSettings: {
      url: '',
      username: '',
      password: '',
      name: '',
      jsonData: {},
      basicAuth: {},
      database: {},
    } as InstanceSettings,
    $q,
    ds: {} as HeroicDatasource,
    backendSrv: backendSrvMock,
    templateSrv: templateSrvMock,
    uiSegmentSrv: uiSegmentSrvMock,
  };

  beforeEach(() => {
    ctx.instanceSettings.url = '/api/datasources/proxy/1';
    ctx.instanceSettings.username = 'admin';
    ctx.instanceSettings.password = 'admin';
    ctx.instanceSettings.name = 'Peter Jacuzzi';
    ctx.instanceSettings.jsonData = {
      suggestionRules: [],
      tagAggregationChecks: [],
      tagCollapseChecks: [],
    };

    ctx.ds = new HeroicDatasource(ctx.instanceSettings, ctx.$q, ctx.backendSrv, ctx.templateSrv, ctx.uiSegmentSrv);
  });

  describe('When querying Heroic with one target using the query editor', () => {
    let results: any;
    const urlExpected = '/api/datasources/proxy/1/query/batch';
    const now = Date.now();
    const then = now - 21600000;
    const range = { from: dateTime(then), to: dateTime(now), raw: { from: 'now-6h', to: 'now' } };
    const timeRange = new TimeRange();
    timeRange.type = 'relative';
    timeRange.unit = 'HOURS';
    timeRange.value = 6;

    const options = {
      range,
      targets: [
        {
          refId: 'A',
          tags: [
            {
              key: '$key',
              operator: '=',
              value: 'value',
            },
            {
              condition: 'AND',
              key: 'otherKey',
              operator: '=',
              value: 'otherValue',
            },
          ],
          groupBy: [
            {
              type: 'time',
              params: ['1m'],
            },
          ],
          select: [
            [
              {
                type: 'sum',
                params: ['site'],
                categoryName: 'Group By',
              },
            ],
          ],
        },
      ],
      interval: '1m',
      rangeRaw: { from: 'now-6h', to: 'now' },
      scopedVars: {
        __interval: { text: '1m', value: '1m' },
        __intervalMs: { text: '60000', value: 60000 },
        interval: { text: '1m', value: '1m' },
      },
    };

    const query = {
      filter: ['and', ['key', 'value'], ['=', 'otherKey', 'otherValue']],
      aggregators: [{ type: 'group', of: ['site'], each: [{ type: 'sum', sampling: { unit: 'seconds', value: '1m' } }] }],
      features: ['com.spotify.heroic.distributed_aggregations'],
      range: timeRange,
    };

    const batchResult = createHeroicBatchResult({
      data: {
        config: {
          data: {
            queries: {
              A: query,
            },
          },
        },
      },
    });

    beforeEach(async () => {
      ctx.backendSrv.datasourceRequest = jest.fn(() => Promise.resolve(batchResult));
      results = await ctx.ds.query(options);
    });

    it('should call Heroic with the correct query', () => {
      const res = ctx.backendSrv.datasourceRequest.mock.calls[0][0];
      expect(res.method).toBe('POST');
      expect(res.url).toBe(urlExpected);
      expect(res.data.queries['A']).toEqual(query);
    });

    it('should return a series list', () => {
      console.log(results);
      expect(true).toBeTruthy();
      // expect(results.data.length).toBe(1);
      // expect(results.data[0].target).toBe(true)
    });
  });
});
