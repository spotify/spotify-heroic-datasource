import HeroicQuery from '../heroic_query';

describe('HeroicQuery', () => {
  let ctx = {} as any;
  beforeEach(() => {
    ctx = {
      target: { select: [[]], tags: [] },
      templateSrv: {
        replace: str => str
      },
      scopedVars: {
        __interval: { text: "30s", value: "30s" },
        __interval_ms: { text: "30000", value: 30000 },
        interval: { text: "30s", value: "30s" }
      }
    }
  })

  describe('when building Heroic query filters...', () => {

    describe('...when given a $key filter...', () => {

      beforeEach(() => {
        ctx.target.tags = [{ key: "$key", operator: "=", value: "value" }]
      });

      it('...should build filters correctly if the $key should match', () => {
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and')
        expect(query.filter[1]).toEqual(['key', 'value'])
      })

      it('...should build filters correctly if the $key should NOT match', () => {
        ctx.target.tags[0].operator = '!=';
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and')
        expect(query.filter[1]).toEqual(['not', ['key', 'value']])
      })

      it('...should build filters correctly if the $key should be prefixed with', () => {
        ctx.target.tags[0].operator = '^';
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and')
        expect(query.filter[1]).toEqual(['^', 'key', 'value'])
      })

      it('...should build filters correctly if the $key should NOT be prefixed with', () => {
        ctx.target.tags[0].operator = '!^';
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();
        expect(query.filter.length).toEqual(2);
        expect(query.filter[0]).toEqual('and')
        expect(query.filter[1]).toEqual(['not', ['^', 'key', 'value']])
      })

      it('...should build filters corrrectly if other filters are present', () => {
        ctx.target.tags.push(
          { key: "key2", operator: "=", value: "value2" },
          { key: "key3", operator: "!=", value: "value3" }
        );
        const queryModel = new HeroicQuery(ctx.target, ctx.templateSrv, ctx.scopedVars);
        const query = queryModel.render();

        expect(query.filter.length).toEqual(4)
        expect(query.filter[0]).toEqual('and')
        expect(query.filter[1]).toEqual(['key', 'value'])
        expect(query.filter[2]).toEqual(['=', 'key2', 'value2'])
        expect(query.filter[3]).toEqual(['not', ['=', 'key3', 'value3']])
      })
    })
  })
})