export type AdvisedImagesInput = {
  model: Record<string, unknown>;
  items: readonly number[];
};

export type SlotImageInput = {
  slot: unknown;
  wanted: ReadonlySet<number>;
};
