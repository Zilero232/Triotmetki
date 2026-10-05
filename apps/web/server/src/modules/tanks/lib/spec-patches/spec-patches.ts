import type { TankPatchVerdict } from '@otmetki/schemas';

import { isNumber } from 'remeda';

import type { ChangeEffect, PatchVerdictInput, SpecChange } from './spec-patches.types';

import { SPEC_DIRECTION } from '../../config/patches.constants';
import { specChangesSchema } from './spec-patches.schemas';

const higherIsBetter = (path: string): boolean | null => {
  const segments = path.split(SPEC_DIRECTION.separator);
  const last = segments.at(-1) ?? '';

  if (SPEC_DIRECTION.lower.includes(last)) {
    return false;
  }

  if (SPEC_DIRECTION.higher.includes(last) || SPEC_DIRECTION.higherPrefixes.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  return null;
};

export const changeEffect = ({ path, before, after }: SpecChange): ChangeEffect => {
  const direction = higherIsBetter(path);

  if (direction === null || !isNumber(before) || !isNumber(after) || before === after) {
    return 'neutral';
  }

  return after > before === direction ? 'better' : 'worse';
};

export const readSpecChanges = (value: unknown): SpecChange[] | null => {
  const parsed = specChangesSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
};

export const patchVerdict = ({ changes, isFirst }: PatchVerdictInput): TankPatchVerdict => {
  if (isFirst) {
    return 'new';
  }

  const better = changes.some((change) => change.effect === 'better');
  const worse = changes.some((change) => change.effect === 'worse');

  if (better && worse) {
    return 'mixed';
  }

  if (better) {
    return 'buff';
  }

  return worse ? 'nerf' : 'changed';
};
