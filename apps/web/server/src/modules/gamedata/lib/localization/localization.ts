import { isDefined, unique } from 'remeda';

import type { LoadLocalizationInput, LocalizedMessages, TranslateInput } from './localization.types';

import { parsePoMessages } from '../parsers/po/po';
import { GAME_PATHS } from '../source/source.constants';
import { LOCALIZATION } from './localization.constants';

const domainOf = (key: string): string | undefined => {
  const index = key.indexOf(LOCALIZATION.separator);

  return index > 0 ? key.slice(0, index) : undefined;
};

export const localizationDomains = (keys: readonly (string | undefined)[]): string[] =>
  unique(keys.filter(isDefined).map(domainOf).filter(isDefined));

export const loadLocalization = async ({ reader, keys }: LoadLocalizationInput): Promise<LocalizedMessages> => {
  const files = await Promise.all(
    localizationDomains(keys).map(async (domain) => ({
      domain,
      source: await reader.read(`${GAME_PATHS.localization}/${domain}${LOCALIZATION.extension}`)
    }))
  );

  return Object.fromEntries(
    files.flatMap(({ domain, source }) =>
      source ? Object.entries(parsePoMessages(source)).map(([id, text]) => [`${domain}${LOCALIZATION.separator}${id}`, text]) : []
    )
  );
};

export const translate = ({ messages, key }: TranslateInput): string | undefined => {
  if (!key) {
    return undefined;
  }

  const text = messages[key]?.trim();

  return text || undefined;
};
