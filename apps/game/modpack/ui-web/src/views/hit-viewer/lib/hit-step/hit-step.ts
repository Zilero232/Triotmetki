import type { HitStep, HitStepInput } from './hit-step.types';

import { HIT_VIEWER } from '../../config';

export const hitStep = ({ indexes, selected, step }: HitStepInput): number | null => {
  if (indexes.length === 0) {
    return null;
  }

  const position = selected === null ? -1 : indexes.indexOf(selected);
  const next = position === -1 ? 0 : (position + step + indexes.length) % indexes.length;

  return indexes[next] ?? null;
};

const isOneOf = (keys: readonly string[], key: string): boolean => keys.includes(key);

export const stepOfKey = (key: string): HitStep | null => {
  if (isOneOf(HIT_VIEWER.keys.next, key)) {
    return 1;
  }

  return isOneOf(HIT_VIEWER.keys.previous, key) ? -1 : null;
};
