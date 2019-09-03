export interface RenderedQuery {
  filter: Filter;
  aggregators: any[];
  features: string[];
  range: string;
}

export type Filter = (string | string[])[];

export interface Target {
  alias: string;
  globalAggregation?: boolean;

  query: string;
  queryRaw: string;
  rawQuery: boolean;
  resultFormat?: string;
  refId: string;
  tags?: Tag[];
  queryResolution: string;

  measurement?: string;
  select?: any[];
  groupBy?: GroupBy[];
  orderByTime?: string;
}

export interface GroupBy {
  type: string,
  params: string[]
}

export interface Tag {
  key: string,
  operator: string,
  value: string,
}

export type Datapoint = [number, number];

export interface DataSeries {
  refId: string;
  datapoints: Datapoint[];
  target: string;
  scoped: any;

  // TODO: improve type, ensure this is actually being set
  limits: any;
}
