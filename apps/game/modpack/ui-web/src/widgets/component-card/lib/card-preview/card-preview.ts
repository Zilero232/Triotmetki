import type { UiComponent, UiField } from '../../../../shared/api/protocol';
import type { CardPreviewKind, CardSummaryModel, CarouselPreviewModel, KeyChip } from './card-preview.types';

import { CARD_PREVIEWS, CARD_SUMMARY, CAROUSEL_PREVIEW } from '../../config';

const valueOf = (fields: UiField[], key: string): string | null => {
  const field = fields.find((item) => item.key === key);

  return field ? String(field.value) : null;
};

export const cardPreviewKind = (component: UiComponent): CardPreviewKind | null => {
  if (component.panel) {
    return 'panel';
  }

  const previews: Partial<Record<string, CardPreviewKind>> = CARD_PREVIEWS;

  return previews[component.id] ?? null;
};

export const carouselPreview = (fields: UiField[]): CarouselPreviewModel => {
  const rows = Number(valueOf(fields, CAROUSEL_PREVIEW.rowsKey));

  return {
    rows: Number.isInteger(rows) && rows >= 1 && rows <= CAROUSEL_PREVIEW.maxRows ? rows : null,
    small: valueOf(fields, CAROUSEL_PREVIEW.tilesKey) === CAROUSEL_PREVIEW.smallTiles
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
