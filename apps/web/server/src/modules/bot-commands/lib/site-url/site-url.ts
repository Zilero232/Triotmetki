import type { LinkUrlInput, PlayerUrlInput, StatCardUrlInput } from '../../bot-commands.types';

import { LOCAL_HOSTS, SITE_LINKS } from '../../config/links.constants';

export const siteUrl = ({ webUrl, path }: LinkUrlInput): string => new URL(path, webUrl).href;

export const playerUrl = ({ webUrl, nickname }: PlayerUrlInput): string =>
  siteUrl({ webUrl, path: SITE_LINKS.player.replace('{nickname}', encodeURIComponent(nickname)) });

export const statCardUrl = ({ webUrl, accountId }: StatCardUrlInput): string =>
  siteUrl({ webUrl, path: SITE_LINKS.statCard.replace('{accountId}', String(accountId)) });

export const isPublicUrl = (raw: string): boolean => {
  try {
    const url = new URL(raw);

    return url.protocol === 'https:' && !LOCAL_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
};
