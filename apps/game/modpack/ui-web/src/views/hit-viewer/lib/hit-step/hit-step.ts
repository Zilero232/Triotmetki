import { isIncludedIn } from 'remeda';

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

export const stepOfKey = (key: string): HitStep | null => {
  if (isIncludedIn(key, HIT_VIEWER.keys.next)) {
    return 1;
  }

  return isIncludedIn(key, HIT_VIEWER.keys.previous) ? -1 : null;
};
