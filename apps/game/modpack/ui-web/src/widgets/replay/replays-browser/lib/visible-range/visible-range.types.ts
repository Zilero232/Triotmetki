export type VisibleRangeInput = {
  scrollTop: number;
  viewport: number;
  rowHeight: number;
  count: number;
  overscan: number;
};

export type VisibleRange = {
  start: number;
  end: number;
  total: number;
};
