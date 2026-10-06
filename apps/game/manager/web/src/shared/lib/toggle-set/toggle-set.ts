import type { ToggledSetInput } from './toggle-set.types';

export const toggledSet = <T>({ set, item, isOn }: ToggledSetInput<T>): Set<T> => {
  const next = new Set(set);

  if (isOn) {
    next.add(item);
  } else {
    next.delete(item);
  }

  return next;
};
