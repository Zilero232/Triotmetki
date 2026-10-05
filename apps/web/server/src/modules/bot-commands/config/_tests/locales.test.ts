import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createFluentStore } from '../../lib/fluent-store/fluent-store';
import { BOT_LOCALE } from '../bot-commands.constants';
import { BOT_COMMAND_LOCALE_FILES } from '../locales.constants';

const messageKeys = (locale: (typeof BOT_LOCALE.locales)[number]) =>
  readFileSync(BOT_COMMAND_LOCALE_FILES[locale], 'utf8')
    .split(/\r?\n/u)
    .flatMap((line) => /^([a-z][\w-]*)\s*=/u.exec(line)?.[1] ?? [])
    .sort();

describe('shared bot command locales', () => {
  it('define the same messages in every language', () => {
    expect(messageKeys('en')).toEqual(messageKeys('ru'));
  });

  it('parse with Fluent and substitute variables', () => {
    const i18n = createFluentStore({ files: BOT_COMMAND_LOCALE_FILES });

    expect(i18n.t('en', 'top-line', { place: 1, nickname: 'Tanker', wn8: '2 500', battles: '10' })).toContain('Tanker');
    expect(i18n.t('ru', 'marks-card', { moe3: 1, moe2: 2, moe1: 3 })).toContain('3');
  });
});
