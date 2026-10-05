import { RATING_TIERS } from '@otmetki/ratings';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { commandDefinitions } from '../../lib/command-definitions/command-definitions';
import { DISCORD_LOCALE_FILES } from '../locales.constants';

const messageKeys = (locale: keyof typeof DISCORD_LOCALE_FILES) =>
  readFileSync(DISCORD_LOCALE_FILES[locale], 'utf8')
    .split(/\r?\n/u)
    .flatMap((line) => /^([a-z][\w-]*)\s*=/u.exec(line)?.[1] ?? [])
    .sort();

describe('discord locales', () => {
  it('define the same messages in every language', () => {
    expect(messageKeys('en')).toEqual(messageKeys('ru'));
  });

  it('describe every slash command, option and rating tier', () => {
    const used = new Set<string>();

    commandDefinitions({
      describe: (key) => {
        used.add(key);

        return { description: key, description_localizations: {} };
      }
    });

    expect(messageKeys('ru')).toEqual(expect.arrayContaining([...used, ...RATING_TIERS.map((tier) => `tier-${tier}`)]));
  });
});
