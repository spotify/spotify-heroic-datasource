import HeroicDatasource from './datasource';
import TimeRange from './time_range';
import { dateTime } from '@grafana/data';
import $q from 'q';
import { HeroicBatchResult, datasource } from './types';
import { templateSrvMock, uiSegmentSrvMock, backendSrvMock } from '../test-setup/mocks';

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
      jsonData: {} as datasource.JSONSettings,
      basicAuth: {},
      database: {},
    } as datasource.InstanceSettings,
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

  describe('When querying Heroic with one target', () => {
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
          alias: 'test-alias',
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

    const queryResult = {
      queryId: 'id',
      range: {
        type: "relative",
        unit: "SECONDS",
        value: 60
      },
      filter: ['and', ['key', 'value'], ['=', 'otherKey', 'otherValue']],
      aggregation: {
        type: "group",
        of: ["site"],
        each: {
          type: "sum"
        }
      },
      result: [
        {
          type: 'points',
          hash: 'hash555',
          values: [
            [20892.138488704415, 1577728800000],
            [20841.156517634838, 1577732400000]
          ]
        }
      ],
      limits: [],
      errors: []
    }

    const batchResult = createHeroicBatchResult({
      data: { results: { A: queryResult } },
      config: { data: { queries: { A: query, }, }, },
    });

    beforeEach(async () => {
      ctx.backendSrv.datasourceRequest = jest.fn(() => Promise.resolve(batchResult));
      results = await ctx.ds.query(options);
    });

    it('...should call Heroic with the correct query', () => {
      const res = ctx.backendSrv.datasourceRequest.mock.calls[0][0];

      expect(res.data.queries['A']).toMatchObject(query);
    });

    it('...should call Heroic with the correct HTTP request', () => {
      const res = ctx.backendSrv.datasourceRequest.mock.calls[0][0];

      expect(res.inspect.type).toBe('heroic');
      expect(res.method).toBe('POST');
      expect(res.url).toBe(urlExpected);
    })

    it('...should return a correct time series', () => {
      const query = results.data[0];
      const datapoints = [
        [1577728800000, 20892.138488704415],
        [1577732400000, 20841.156517634838]
      ];

      expect(query.refId).toBe(options.targets[0].refId);
      expect(query.target).toBe(options.targets[0].alias)
      expect(query.datapoints.length).toBe(2);
      expect(query.datapoints).toEqual(datapoints)
    });

    it('...should return a time series with the correct meta properties present', () => {
      expect(results.data[0]).toHaveProperty('meta')
      expect(results.data[0].meta.scoped).toBeDefined()
      expect(results.data[0].meta.errors).toBeDefined()
      expect(results.data[0].meta.limits).toBeDefined()
    });

  });
});
