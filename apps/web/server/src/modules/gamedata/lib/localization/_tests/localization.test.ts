import { describe, expect, it } from 'vitest';

import type { RepoReader } from '../../source/source.types';

import { GAME_PATHS } from '../../source/source.constants';
import { loadLocalization, localizationDomains, translate } from '../localization';
import { LOCALIZATION } from '../localization.constants';

const USSR_PO = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\n"

msgid "R149_Object_268_4"
msgstr "Объект 268 Вариант 4"

msgid "R149_Object_268_4_short"
msgstr "Об. 268/4"

msgid "Untranslated"
msgstr ""
`;

const CHINA_PO = `msgid "Ch56_BZ_74_1"
msgstr "BZ-74-1"
`;

const poPath = (domain: string): string => `${GAME_PATHS.localization}/${domain}${LOCALIZATION.extension}`;

const reader = (files: Record<string, string>): RepoReader & { reads: string[] } => {
  const reads: string[] = [];

  return {
    reads,
    revision: { owner: 'izeberg', repo: 'wot-src', ref: 'RU', sha: 'memory' },
    read: async (path) => {
      reads.push(path);

      return files[path];
    }
  };
};

describe('localizationDomains', () => {
  it('lists each domain once and skips keys without one', () => {
    expect(localizationDomains(['ussr_vehicles:IS', undefined, 'ussr_vehicles:IS_short', 'china_vehicles:Ch56', 'bare', ':x'])).toEqual([
      'ussr_vehicles',
      'china_vehicles'
    ]);
  });
});

describe('loadLocalization', () => {
  it('reads one .po file per domain and keys its messages by the full localization key', async () => {
    const source = reader({ [poPath('ussr_vehicles')]: USSR_PO, [poPath('china_vehicles')]: CHINA_PO });

    const messages = await loadLocalization({
      reader: source,
      keys: ['ussr_vehicles:R149_Object_268_4', 'ussr_vehicles:R149_Object_268_4_short', 'china_vehicles:Ch56_BZ_74_1']
    });

    expect(source.reads).toEqual([poPath('ussr_vehicles'), poPath('china_vehicles')]);

    expect(messages).toEqual({
      'ussr_vehicles:R149_Object_268_4': 'Объект 268 Вариант 4',
      'ussr_vehicles:R149_Object_268_4_short': 'Об. 268/4',
      'china_vehicles:Ch56_BZ_74_1': 'BZ-74-1'
    });
  });

  it('skips a domain whose file is missing', async () => {
    expect(await loadLocalization({ reader: reader({}), keys: ['uk_vehicles:GB01'] })).toEqual({});
  });
});

describe('translate', () => {
  const messages = { 'ussr_vehicles:IS': ' ИС ', 'ussr_vehicles:blank': '   ' };

  it('returns the trimmed message for a known key', () => {
    expect(translate({ messages, key: 'ussr_vehicles:IS' })).toBe('ИС');
  });

  it('returns undefined for a missing key, a blank message or no key at all', () => {
    expect(translate({ messages, key: 'ussr_vehicles:KV-1' })).toBeUndefined();
    expect(translate({ messages, key: 'ussr_vehicles:blank' })).toBeUndefined();
    expect(translate({ messages, key: undefined })).toBeUndefined();
  });
});
