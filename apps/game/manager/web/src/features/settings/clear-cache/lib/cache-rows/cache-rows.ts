import { sumBy } from 'remeda';

import type { CacheTarget } from '../../api';
import type { CacheRow, CacheRowsInput, ChosenTargetsInput } from './cache-rows.types';

export const cacheRows = ({ targets, unchecked, sizeOf }: CacheRowsInput): CacheRow[] =>
  targets.map((target) => ({
    id: target.id,
    name: target.name,
    location: target.location,
    path: target.path,
    size: sizeOf(target.sizeBytes),
    files: target.files,
    checked: !unchecked.has(target.id)
  }));

export const chosenTargets = ({ targets, unchecked }: ChosenTargetsInput): CacheTarget[] => targets.filter((target) => !unchecked.has(target.id));

export const totalBytes = (targets: readonly CacheTarget[]): number => sumBy(targets, (target) => target.sizeBytes);
