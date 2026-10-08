import { describe, expect, it } from 'vitest';

import { collapsePaths, declaredMessages, isCoveredBy } from '../message-usage';

describe('isCoveredBy', () => {
  it('treats a path as covered by itself or by any of its ancestors', () => {
    expect(isCoveredBy({ key: 'tank.meta.title', paths: ['tank'] })).toBe(true);
    expect(isCoveredBy({ key: 'tank.meta', paths: ['tank.meta'] })).toBe(true);
  });

  it('never treats a sibling with the same prefix or a descendant as cover', () => {
    expect(isCoveredBy({ key: 'tanks.picker', paths: ['tank'] })).toBe(false);
    expect(isCoveredBy({ key: 'tank', paths: ['tank.meta'] })).toBe(false);
  });
});

describe('collapsePaths', () => {
  it('drops duplicates and paths an ancestor already holds', () => {
    expect(collapsePaths(['tank.meta', 'tank', 'nav.items', 'nav.items'])).toEqual(['nav.items', 'tank']);
  });
});

describe('declaredMessages', () => {
  it('reads the list a route passes to withMessages, across line breaks', () => {
    const source = "export default withMessages({\n  component: Page,\n  messages: ['tank', 'plus.teaser']\n});";

    expect(declaredMessages(source)).toEqual(['tank', 'plus.teaser']);
  });

  it('reports a route without a declaration', () => {
    expect(declaredMessages('export default Page;')).toBeNull();
  });
});
