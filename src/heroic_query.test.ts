import HeroicQuery from './heroic_query';
import { templateSrvMock } from '../test-setup/mocks';

describe('HeroicQuery', () => {
  let ctx = {} as any;
  beforeEach(() => {
    ctx = {
      target: { select: [[]], tags: [] },
      templateSrv: templateSrvMock,
      scopedVars: {
        __interval: { text: "30s", value: "30s" },
        __interval_ms: { text: "30000", value: 30000 },
        interval: { text: "30s", value: "30s" }
      }
    };
  });

  describe('when building Heroic query filters...', () => {

    describe('...when given a $key filter...', () => {

      beforeEach(() => {
        ctx.target.tags = [{ key: "$key", operator: "=", value: "value" }];
      });

      it('...should build filters correctly if the $key should match', () => {
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and');
        expect(query.filter[1]).toEqual(['key', 'value']);
      });

      it('...should build filters correctly if the $key should NOT match', () => {
        ctx.target.tags[0].operator = '!=';
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and');
        expect(query.filter[1]).toEqual(['not', ['key', 'value']]);
      });

      it('...should build filters correctly if the $key should be prefixed with', () => {
        ctx.target.tags[0].operator = '^';
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and');
        expect(query.filter[1]).toEqual(['^', 'key', 'value']);
      });

      it('...should build filters correctly if the $key should NOT be prefixed with', () => {
        ctx.target.tags[0].operator = '!^';
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();
        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and');
        expect(query.filter[1]).toEqual(['not', ['^', 'key', 'value']]);
      });

      it('...should build filters corrrectly if other filters are present', () => {
        ctx.target.tags.push(
          { key: "key2", operator: "=", value: "value2" },
          { key: "key3", operator: "!=", value: "value3" }
        );
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(4);
        expect(query.filter[0]).toEqual('and');
        expect(query.filter[1]).toEqual(['key', 'value']);
        expect(query.filter[2]).toEqual(['=', 'key2', 'value2']);
        expect(query.filter[3]).toEqual(['not', ['=', 'key3', 'value3']]);
      });
    });

    describe('...when given a filter aggregation', () => {

      const someGlobalVars = { '$var': 100 };

      beforeEach(() => {
        ctx.target.tags = [{ key: "key", operator: "=", value: "value" }];
        ctx.templateSrv.replace = jest.fn(query => query.startsWith('$') ? someGlobalVars[query] || null : query);
      });

      it('...should set the correct default value', () => {
        ctx.target.select = [[{ type: "abovek", params: ['5'], categoryName: "Filters" }]];
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.aggregators.length).toEqual(1);
        expect(query.aggregators[0].type).toEqual('abovek');
        expect(query.aggregators[0].k).toEqual(5);
        expect(query.aggregators[0].of.type).toEqual('empty');
      });

      it('...should set the correct value', () => {
        ctx.target.select = [[{ type: 'belowk', params: ['100'], categoryName: "Filters" }]];
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.aggregators.length).toEqual(1);
        expect(query.aggregators[0].type).toEqual('belowk');
        expect(query.aggregators[0].k).toEqual(100);
        expect(query.aggregators[0].of.type).toEqual('empty');
      });

      it('...should set the correct value when given a valid variable', () => {
        ctx.target.select = [[{ type: 'topk', params: ['$var'], categoryName: "Filters" }]];
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(ctx.templateSrv.replace).toHaveBeenCalledWith('$var');
        expect(query.aggregators.length).toEqual(1);
        expect(query.aggregators[0].type).toEqual('topk');
        expect(query.aggregators[0].k).toEqual(100);
        expect(query.aggregators[0].of.type).toEqual('empty');
      });

      it('...should set the return null when given an invalid variable', () => {
        ctx.target.select = [[{ type: 'topk', params: ['badVarWithNoDollarSignPrefix'], categoryName: "Filters" }]];
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(ctx.templateSrv.replace).toHaveBeenCalledWith('badVarWithNoDollarSignPrefix');
        expect(query.aggregators.length).toEqual(1);
        expect(query.aggregators[0].type).toEqual('topk');
        expect(query.aggregators[0].k).toBeNull();
        expect(query.aggregators[0].of.type).toEqual('empty');
      });

    });
  });
});
