export type ToggledSetInput<T> = {
  set: ReadonlySet<T>;
  item: T;
  isOn: boolean;
};
