import { describe, expect, it } from 'vitest';

import type { UiComponent } from '../../../../../shared/api/protocol';

import { listsBothContexts } from '../context-filter';

const card = (context: UiComponent['context']): UiComponent => ({
  id: context,
  group: 'hangar',
  section: 'hangar',
  context,
  title: context,
  hint: null,
  switch: null,
  fields: [],
  panel: false,
  actions: [],
  page: null
});

describe(listsBothContexts, () => {
  it('filters a page with hangar and battle cards', () => {
    expect(listsBothContexts([card('hangar'), card('battle')])).toBe(true);
  });

  it('does not filter a page whose other cards work anywhere', () => {
    expect(listsBothContexts([card('hangar'), card('any')])).toBe(false);
  });

  it('does not filter a page of battle cards only', () => {
    expect(listsBothContexts([card('battle'), card('battle')])).toBe(false);
  });
});
