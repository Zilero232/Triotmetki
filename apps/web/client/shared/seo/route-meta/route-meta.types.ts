export type RouteStaticParamsInput = {
  fallback?: string;
  limit?: number;
};

export type RouteEntityRecord = {
  name: string;
  key: string;
};

export type RouteEntityInput = {
  key: string;
  load: () => Promise<RouteEntityRecord>;
};

export type RouteEntity = RouteEntityRecord & {
  isFound: boolean;
};

export type RouteLookup = RouteEntity & {
  isAvailable: boolean;
};

export type RouteMeta<T> = {
  meta: T | null;
  isFound: boolean;
};

export type RouteMetaLookup<T> = RouteMeta<T> & {
  isAvailable: boolean;
};

export type RouteLookupInput = Pick<RouteEntityInput, 'key'> & {
  lookup: (key: string) => Promise<RouteLookup>;
};

export type RouteSlugsInput = Pick<RouteStaticParamsInput, 'fallback'> & {
  load: () => Promise<string[]>;
};
