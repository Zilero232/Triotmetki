import { describe, expect, it } from 'vitest';

import type { CardData, CardRowData } from '../../../model/schemas';

import { hasCardBody, rowIcon } from '../card-view';

const row = (overrides: Partial<CardRowData> = {}): CardRowData => ({
  icon: null,
  status: null,
  label: null,
  text: null,
  text_tone: 'text',
  value: null,
  tone: 'text',
  color: null,
  note: null,
  detail: null,
  progress: null,
  progress_tone: 'accent',
  ...overrides
});

const card = (overrides: Partial<CardData> = {}): CardData => ({
  title: 'ЛБЗ',
  icon: null,
  subtitle: null,
  value: null,
  value_tone: 'text',
  chips: [],
  strip: [],
  rows: [],
  footer: null,
  width: null,
  ...overrides
});

describe(hasCardBody, () => {
  it('is false for a card with only a header', () => {
    const data = card();

    const hasBody = hasCardBody(data);

    expect(hasBody).toBe(false);
  });

  it('is true for a card with rows', () => {
    const data = card({ rows: [row()] });

    const hasBody = hasCardBody(data);

    expect(hasBody).toBe(true);
  });

  it('is true for a card with only a footer', () => {
    const data = card({ footer: 'ср. урон 2 781' });

    const hasBody = hasCardBody(data);

    expect(hasBody).toBe(true);
  });

  it('is true for a card with only a strip of marks', () => {
    const data = card({ strip: ['good'] });

    const hasBody = hasCardBody(data);

    expect(hasBody).toBe(true);
  });
});

describe(rowIcon, () => {
  it('keeps the row icon and tone when the row has no status', () => {
    const plain = row({ icon: 'otmetki:fire', tone: 'bad' });

    const icon = rowIcon(plain);

    expect(icon).toEqual({ icon: 'otmetki:fire', tone: 'bad' });
  });

  it('draws the status glyph in the status tone over the row icon', () => {
    const done = row({ icon: 'otmetki:fire', tone: 'bad', status: 'done' });

    const icon = rowIcon(done);

    expect(icon).toEqual({ icon: 'otmetki:check', tone: 'good' });
  });
});
