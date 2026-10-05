import { describe, expect, it } from 'vitest';

import { BOT_LOCALE } from '../../../config/bot-commands.constants';
import { BOT_COMMAND_LOCALE_FILES } from '../../../config/locales.constants';
import { createFluentStore } from '../fluent-store';

describe('createFluentStore', () => {
  it('loads every locale file it is given', () => {
    const i18n = createFluentStore({ files: BOT_COMMAND_LOCALE_FILES });

    expect([...i18n.locales].sort()).toEqual(Object.keys(BOT_COMMAND_LOCALE_FILES).sort());
  });

  it('translates in the requested locale and interpolates values without isolation marks', () => {
    const i18n = createFluentStore({ files: BOT_COMMAND_LOCALE_FILES });

    const ru = i18n.t('ru', 'player-brief', { wn8: '1500', winRate: '52%', battles: '100' });
    const en = i18n.t('en', 'player-brief', { wn8: '1500', winRate: '52%', battles: '100' });

    expect(ru).toContain('1500');
    expect(ru).not.toBe(en);
    expect(ru).not.toMatch(/[⁨⁩]/u);
  });

  it('falls back to the default locale for an unknown language', () => {
    const i18n = createFluentStore({ files: BOT_COMMAND_LOCALE_FILES });

    expect(i18n.t('de', 'player-not-found')).toBe(i18n.t(BOT_LOCALE.fallbackLocale, 'player-not-found'));
  });
});
