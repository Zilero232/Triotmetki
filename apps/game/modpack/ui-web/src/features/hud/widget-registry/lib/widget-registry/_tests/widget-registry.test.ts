import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FONT_SAFE } from '@/shared/lib/font-safe';
import { readWidget, WIDGET_FIXTURE } from '@/shared/lib/testing/widget-fixture';

import { resolveWidget, widgetKinds, widgetLines } from '../widget-registry';

const FIXTURE_KINDS = readdirSync(WIDGET_FIXTURE.dir).map((file) => file.replace('.sample.json', ''));

const isUnsafeGlyph = (char: string): boolean => (char.codePointAt(0) ?? 0) >= FONT_SAFE.firstUnsafe && !FONT_SAFE.kept.includes(char);

const resolveFixture = (kind: string) => {
  const resolved = resolveWidget(readWidget(kind));

  if (!resolved) {
    throw new Error(`the ${kind} fixture does not resolve`);
  }

  return resolved;
};

describe(widgetKinds, () => {
  it('knows every widget the Python side writes a fixture for', () => {
    expect(widgetKinds().sort()).toEqual([...FIXTURE_KINDS].sort());
  });
});

describe(resolveWidget, () => {
  it.each(FIXTURE_KINDS)('accepts the %s fixture', (kind) => {
    expect(resolveWidget(readWidget(kind))?.kind).toBe(kind);
  });

  it.each(FIXTURE_KINDS)('draws the %s fixture only in glyphs the client font has', (kind) => {
    const text = JSON.stringify(resolveFixture(kind).data);

    expect(Array.from(text).filter(isUnsafeGlyph)).toEqual([]);
  });

  it('gives nothing without a widget', () => {
    expect(resolveWidget(null)).toBeNull();
  });

  it('falls back to the text for an unknown kind', () => {
    expect(resolveWidget({ kind: 'nope', v: 1, data: {} })).toBeNull();
  });

  it('falls back to the text for another widget version', () => {
    expect(resolveWidget({ kind: 'team_hp', v: 2, data: readWidget('team_hp').data })).toBeNull();
  });

  it('falls back to the text for data that fails its schema', () => {
    expect(resolveWidget({ kind: 'team_hp', v: 1, data: { style: 'full' } })).toBeNull();
  });
});

describe(widgetLines, () => {
  it.each(FIXTURE_KINDS)('counts at least the base line budget for the %s fixture', (kind) => {
    expect(widgetLines(resolveFixture(kind))).toBeGreaterThanOrEqual(1000);
  });
});
