export type PageWindow = {
  take: number;
  skip: number;
};

export type PaginateInput<T> = {
  limit: number;
  offset: number;
  fetch: (window: PageWindow) => Promise<T[]>;
  count: () => Promise<number>;
};
