import type { FillLabelInput } from './fill-label.types';

import { ARMOR_VIEWER } from '../../config';

export const fillLabel = ({ template, values }: FillLabelInput): string =>
  template.replace(ARMOR_VIEWER.placeholder, (match, key: string) => {
    const value = values[key];

    return value === undefined ? match : String(value);
  });

export const tierLabel = (tier: number | null): string => (tier === null ? '' : (ARMOR_VIEWER.tiers[tier - 1] ?? String(tier)));
