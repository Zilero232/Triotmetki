import { describe, expect, it } from 'vitest';

import { MANAGER_ERROR_CODES } from '@/shared/api';
import { PAGE_IDS, PAGE_SECTIONS } from '@/shared/config';

import { MESSAGES } from '../messages';

const leaves = (value: unknown): unknown[] =>
  typeof value === 'object' && value !== null ? Object.values(value).flatMap((nested) => leaves(nested)) : [value];

const keyPaths = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, nested]) => keyPaths(nested, `${prefix}${key}.`))
    : [prefix.slice(0, -1)];

describe('MESSAGES', () => {
  it('has the same keys in Russian and English', () => {
    expect(keyPaths(MESSAGES.en).toSorted()).toEqual(keyPaths(MESSAGES.ru).toSorted());
  });

  it('has no empty text', () => {
    const texts = leaves(MESSAGES);

    expect(texts.every((text) => typeof text === 'string' && text.trim().length > 0)).toBe(true);
  });

  it('names every section of the navigation', () => {
    expect(Object.keys(PAGE_SECTIONS).every((section) => section in MESSAGES.ru.nav.sections)).toBe(true);
  });

  it('places every page in a section of the navigation', () => {
    const placed = Object.values(PAGE_SECTIONS).flat();

    expect(PAGE_IDS.every((page) => placed.includes(page))).toBe(true);
  });

  it('explains every error code the app can report', () => {
    expect(MANAGER_ERROR_CODES.every((code) => code in MESSAGES.ru.errors)).toBe(true);
  });

  it('gives every error code a hint', () => {
    expect(MANAGER_ERROR_CODES.every((code) => code in MESSAGES.ru.errorHelp)).toBe(true);
  });
});
