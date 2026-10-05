import { describe, expect, it } from 'vitest';

import type { UiComponent, UiField } from '@/shared/api/protocol';

import { cardPreviewKind, carouselPreview } from '../card-preview';

const component = (overrides: Partial<UiComponent> = {}): UiComponent => ({
  id: 'clock',
  group: 'hangar',
  section: 'hangar',
  context: 'hangar',
  title: 'Clock',
  hint: null,
  switch: null,
  fields: [],
  panel: false,
  actions: [],
  page: null,
  ...overrides
});

const choice = (key: string, value: string): UiField => ({ key, label: key, hint: null, type: 'choice', value, default: 'native', choices: [] });

describe(cardPreviewKind, () => {
  it('previews a HUD panel with its own widget', () => {
    expect(cardPreviewKind(component({ panel: true }))).toBe('panel');
  });

  it('previews the hangar tweaks with a carousel', () => {
    expect(cardPreviewKind(component({ id: 'hangar_tweaks' }))).toBe('carousel');
  });

  it('has no preview for a card that changes nothing on screen', () => {
    expect(cardPreviewKind(component())).toBeNull();
  });
});

describe(carouselPreview, () => {
  it('reads the chosen number of rows and the small tiles', () => {
    expect(carouselPreview([choice('carousel_rows', '4'), choice('carousel_tiles', 'small')])).toEqual({ rows: 4, small: true });
  });

  it('leaves the rows to the game when the choice is the game option', () => {
    expect(carouselPreview([choice('carousel_rows', 'native')])).toEqual({ rows: null, small: false });
  });

  it('ignores a row count the carousel cannot take', () => {
    expect(carouselPreview([choice('carousel_rows', '9')]).rows).toBeNull();
  });
});
