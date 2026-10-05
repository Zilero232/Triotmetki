import { isNonNullish, unique } from 'remeda';

import { isRecord } from '@/shared/lib/is-record';

import type { AdvisedImagesInput, SlotImageInput } from './setup-slots.types';

import { PRESET_ADVISOR } from '../../config';
import { toItems } from '../advisor-model';

const { tankSetup, setups, slots, intCD, imageName } = PRESET_ADVISOR.model;

const slotsOf = (section: unknown): unknown[] => toItems(isRecord(section) ? section[slots] : undefined);

const slotImage = ({ slot, wanted }: SlotImageInput): string | null => {
  if (!isRecord(slot)) {
    return null;
  }

  const id = slot[intCD];
  const image = slot[imageName];
  const isWanted = typeof id === 'number' && wanted.has(id);

  return isWanted && typeof image === 'string' && image !== '' ? image : null;
};

export const advisedImages = ({ model, items }: AdvisedImagesInput): string[] => {
  const setup = model[tankSetup];

  if (!isRecord(setup) || items.length === 0) {
    return [];
  }

  const wanted = new Set(items);
  const images = setups.flatMap((name) => slotsOf(setup[name]).map((slot) => slotImage({ slot, wanted })));

  return unique(images.filter(isNonNullish));
};
