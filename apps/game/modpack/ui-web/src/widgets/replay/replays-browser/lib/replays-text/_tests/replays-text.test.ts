import { describe, expect, it } from 'vitest';

import { REPLAYS_EN, REPLAYS_RU } from '../../../config';
import { replaysText } from '../replays-text';

const placeholdersOf = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

const ENGLISH = new Map<string, string>(Object.entries(REPLAYS_EN));

describe(replaysText, () => {
  it('has the same keys in both languages', () => {
    expect(Object.keys(REPLAYS_EN).sort()).toEqual(Object.keys(REPLAYS_RU).sort());
  });

  it('has no blank string', () => {
    const blank = Object.entries(REPLAYS_EN).filter(([, text]) => text.trim() === '');

    expect(blank).toEqual([]);
  });

  it('keeps the same placeholders in both languages', () => {
    const mismatched = Object.entries(REPLAYS_RU)
      .filter(([key, text]) => placeholdersOf(text).join() !== placeholdersOf(ENGLISH.get(key) ?? '').join())
      .map(([key]) => key);

    expect(mismatched).toEqual([]);
  });

  it('fills the named placeholders', () => {
    const t = replaysText('en');

    const text = t('watchVersion', { version: '1.44.1.0', client: '1.45.0.0' });

    expect(text).toContain('1.44.1.0');
    expect(text).toContain('1.45.0.0');
  });

  it('keeps a placeholder it has no value for', () => {
    const t = replaysText('en');

    expect(t('removeConfirm')).toContain('{name}');
  });
});
