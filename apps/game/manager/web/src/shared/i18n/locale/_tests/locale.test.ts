import { describe, expect, it } from 'vitest';

import { resolveLocale } from '../locale';

describe('resolveLocale', () => {
  it('keeps an explicit English choice on a Russian system', () => {
    expect(resolveLocale({ language: 'en', systemLanguage: 'ru-RU' })).toBe('en');
  });

  it('keeps an explicit Russian choice on an English system', () => {
    expect(resolveLocale({ language: 'ru', systemLanguage: 'en-US' })).toBe('ru');
  });

  it('follows a Russian system language when set to automatic', () => {
    expect(resolveLocale({ language: 'auto', systemLanguage: 'ru-RU' })).toBe('ru');
  });

  it('falls back to English for a system language it has no translation for', () => {
    expect(resolveLocale({ language: 'auto', systemLanguage: 'de-DE' })).toBe('en');
  });

  it('falls back to Russian without a system language', () => {
    expect(resolveLocale({ language: 'auto', systemLanguage: undefined })).toBe('ru');
  });
});
