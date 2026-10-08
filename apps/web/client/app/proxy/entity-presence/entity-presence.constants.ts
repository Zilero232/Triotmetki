import type { ClanPage, MapDetail, PlayerProfile, TankDetail } from '@/shared/api/generated';

import {
  blogControllerArticle,
  clansControllerPage,
  mapsControllerDetail,
  missionsControllerOperation,
  playersControllerProfile,
  streamersControllerBySlug,
  tanksControllerDetail
} from '@/shared/api/generated';
import { fromSdk, NotFoundError } from '@/shared/api/source';

import type { EntityCheck, EntityLoadInput, EntityLookup, EntityLookupInput } from './entity-presence.types';

const MISSION_OPERATION_KEY = /^([1-9]\d{0,8})\/([1-9]\d{0,8})$/;

const entityLookup = <T>({ pattern, load, canonicalKey }: EntityLookupInput<T>): EntityLookup => ({
  pattern,
  canonicalKey: async (input) => {
    const data = await fromSdk(() => load(input));

    return canonicalKey ? canonicalKey(data) : null;
  }
});

const tank = {
  load: ({ key, signal, headers }: EntityLoadInput) => tanksControllerDetail({ path: { idOrSlug: key }, signal, headers }),
  canonicalKey: ({ vehicle }: TankDetail) => vehicle.slug
};

const missionOperation = ({ key, signal, headers }: EntityLoadInput) => {
  const ids = MISSION_OPERATION_KEY.exec(key);

  if (!ids) {
    return Promise.reject(new NotFoundError(`No operation ${key}`));
  }

  return missionsControllerOperation({ path: { campaign: Number(ids[1]), operation: Number(ids[2]) }, signal, headers });
};

export const ENTITY_LOOKUPS: readonly EntityLookup[] = [
  entityLookup({
    pattern: /^\/p\/([^/]+)(?:\/|$)/,
    load: ({ key, signal, headers }) => playersControllerProfile({ path: { idOrNick: key }, signal, headers }),
    canonicalKey: ({ summary }: PlayerProfile) => summary.nickname
  }),
  entityLookup({ pattern: /^\/t\/([^/]+)(?:\/armor)?\/?$/, ...tank }),
  entityLookup({ pattern: /^\/builds\/([^/]+)\/?$/, ...tank }),
  entityLookup({
    pattern: /^\/c\/([^/]+)(?:\/|$)/,
    load: ({ key, signal, headers }) => clansControllerPage({ path: { idOrTag: key }, signal, headers }),
    canonicalKey: ({ clan }: ClanPage) => clan.tag
  }),
  entityLookup({
    pattern: /^\/maps\/([^/]+)\/?$/,
    load: ({ key, signal, headers }) => mapsControllerDetail({ path: { idOrSlug: key }, signal, headers }),
    canonicalKey: ({ slug }: MapDetail) => slug
  }),
  entityLookup({
    pattern: /^\/blog\/(?!editor(?:\/|$))([^/]+)\/?$/,
    load: ({ key, signal, headers }) => blogControllerArticle({ path: { slug: key }, signal, headers })
  }),
  entityLookup({ pattern: /^\/missions\/([^/]+\/[^/]+)\/?$/, load: missionOperation }),
  entityLookup({
    pattern: /^\/s\/([^/]+)(?:\/|$)/,
    load: ({ key, signal, headers }) => streamersControllerBySlug({ path: { slug: key }, signal, headers })
  })
];

export const ENTITY_FOUND: EntityCheck = { isMissing: false, canonicalPath: null };

export const ENTITY_PRESENCE = {
  timeoutMs: 2000,
  missingSegment: '_missing',
  localeHeader: 'x-next-intl-locale',
  htmlAccept: 'text/html',
  forwardedForHeader: 'x-forwarded-for',
  forwardedForSeparator: ',',
  redirectStatus: 308
} as const;
