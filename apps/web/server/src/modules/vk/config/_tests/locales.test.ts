import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { VK_LOCALE_FILES } from '../locales.constants';

const messageKeys = (locale: keyof typeof VK_LOCALE_FILES) =>
  readFileSync(VK_LOCALE_FILES[locale], 'utf8')
    .split(/\r?\n/u)
    .flatMap((line) => /^([a-z][\w-]*)\s*=/u.exec(line)?.[1] ?? [])
    .sort();

describe('vk locales', () => {
  it('define the same messages in every language', () => {
    expect(messageKeys('en')).toEqual(messageKeys('ru'));
  });
});
