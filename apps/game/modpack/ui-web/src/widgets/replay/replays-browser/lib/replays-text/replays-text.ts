import type { Language } from '@/shared/i18n';

import type { ReplaysStrings } from '../../config';
import type { ReplaysText } from './replays-text.types';

import { REPLAYS_BROWSER, REPLAYS_EN, REPLAYS_RU } from '../../config';

const CATALOG: Record<Language, ReplaysStrings> = { ru: REPLAYS_RU, en: REPLAYS_EN };

export const replaysText =
  (language: Language): ReplaysText =>
  (key, params) =>
    CATALOG[language][key].replace(REPLAYS_BROWSER.templateToken, (token, name: string) => (params && name in params ? String(params[name]) : token));
