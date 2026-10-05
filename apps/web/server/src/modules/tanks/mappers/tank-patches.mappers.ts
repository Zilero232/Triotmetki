import type { TankPatchChange } from '@otmetki/schemas';

import type { SpecChange } from '../lib/spec-patches/spec-patches.types';

import { changeEffect } from '../lib/spec-patches/spec-patches';

export const toPatchChanges = (changes: readonly SpecChange[]): TankPatchChange[] =>
  changes.map((change) => ({
    key: change.path,
    before: change.before ?? null,
    after: change.after ?? null,
    effect: changeEffect(change)
  }));
