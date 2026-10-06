import type { UiComponent, UiField } from '@/shared/api/protocol';

import type { CardPreviewKind, CardSummaryModel, CarouselPreviewModel, KeyChip } from './card-preview.types';

import { CARD_PREVIEWS, CARD_SUMMARY, CAROUSEL_PREVIEW } from '../../config';
import { fieldValue } from '../field-value';

export const cardPreviewKind = (component: UiComponent): CardPreviewKind | null => {
  if (component.panel) {
    return 'panel';
  }

  const previews: Partial<Record<string, CardPreviewKind>> = CARD_PREVIEWS;

  return previews[component.id] ?? null;
};

export const carouselPreview = (fields: UiField[]): CarouselPreviewModel => {
  const rows = Number(fieldValue({ fields, key: CAROUSEL_PREVIEW.rowsKey }));

  return {
    rows: Number.isInteger(rows) && rows >= 1 && rows <= CAROUSEL_PREVIEW.maxRows ? rows : null,
    small: fieldValue({ fields, key: CAROUSEL_PREVIEW.tilesKey }) === CAROUSEL_PREVIEW.smallTiles
  };
};

const keyChip = (field: UiField): KeyChip | null => {
  if (field.type !== 'choice' || !CARD_SUMMARY.keyField.test(field.key)) {
    return null;
  }

  const choice = field.value === CARD_SUMMARY.noKey ? undefined : field.choices.find(({ value }) => value === field.value);

  return { key: field.key, label: field.label, value: choice?.label ?? null };
};

export const cardSummary = (fields: UiField[]): CardSummaryModel => ({
  keys: fields.map(keyChip).filter((chip): chip is KeyChip => chip !== null),
  checked: fields.filter((field) => field.type === 'bool' && field.value).map(({ label }) => label)
});
