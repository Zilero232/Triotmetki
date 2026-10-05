import { unique } from 'remeda';

import { NEWS_ENRICH } from '../../config/news.constants';

export const patchVersion = (title: string): string | null => NEWS_ENRICH.versionPattern.exec(title)?.[1] ?? null;

export const isPatchNotes = (title: string): boolean => NEWS_ENRICH.patchKind.test(title) && patchVersion(title) !== null;

export const versionCandidates = (version: string): string[] => {
  const parts = version.split('.');

  return unique([version, [...parts, ...Array.from<string>({ length: Math.max(0, 4 - parts.length) }).fill('0')].join('.')]);
};

export const versionsOf = (title: string): string[] => {
  const version = patchVersion(title);

  return version === null ? [] : versionCandidates(version);
};
