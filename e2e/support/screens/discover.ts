import type { APIRequestContext } from '@playwright/test';

import type { ScreenParams } from './screens.constants';

import { SCREENS_ENV, SCREENS_TIMING } from './screens.constants';

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

const scalar = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

/** Breadth-first: the first object in the payload the predicate accepts — list items sit shallower than their nested refs. */
const findObject = (root: unknown, accept: (value: Json) => boolean): Json | undefined => {
  const queue: unknown[] = [root];

  while (queue.length > 0) {
    const node = queue.shift();

    if (Array.isArray(node)) {
      queue.push(...node);

      continue;
    }

    if (!isRecord(node)) {
      continue;
    }

    if (accept(node)) {
      return node;
    }

    queue.push(...Object.values(node));
  }

  return undefined;
};

const findValue = (root: unknown, keys: readonly string[]): string | undefined => {
  const match = findObject(root, (node) => keys.some((key) => scalar(node[key]) !== undefined));

  if (!match) {
    return undefined;
  }

  for (const key of keys) {
    const value = scalar(match[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

const fetchJson = async (request: APIRequestContext, apiPath: string): Promise<unknown> => {
  try {
    const response = await request.get(`${SCREENS_ENV.apiUrl}${apiPath}`, { timeout: SCREENS_TIMING.apiTimeoutMs, failOnStatusCode: false });

    return response.ok() ? await response.json() : undefined;
  } catch {
    return undefined;
  }
};

const firstOf = async (request: APIRequestContext, apiPaths: readonly string[], keys: readonly string[]): Promise<string | undefined> => {
  for (const apiPath of apiPaths) {
    const value = findValue(await fetchJson(request, apiPath), keys);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

const discoverPlayer = async (request: APIRequestContext): Promise<Pick<ScreenParams, 'playerId' | 'playerNick' | 'sessionId'>> => {
  for (const apiPath of ['/players/popular', '/leaderboards']) {
    const player = findObject(await fetchJson(request, apiPath), (node) => scalar(node.nickname) !== undefined);

    if (!player) {
      continue;
    }

    const playerNick = scalar(player.nickname);
    const playerId = scalar(player.accountId) ?? scalar(player.id);
    const sessions = await fetchJson(request, `/players/${encodeURIComponent(playerId ?? playerNick ?? '')}/sessions`);

    return { playerNick, playerId, sessionId: findValue(sessions, ['sessionId', 'id']) };
  }

  return {};
};

const discoverMission = async (request: APIRequestContext): Promise<Pick<ScreenParams, 'missionCampaign' | 'missionOperation'>> => {
  const operation = findObject(
    await fetchJson(request, '/missions'),
    (node) => scalar(node.operationId) !== undefined && scalar(node.campaignId) !== undefined
  );

  return operation ? { missionCampaign: scalar(operation.campaignId), missionOperation: scalar(operation.operationId) } : {};
};

/** Real params for the dynamic routes, read from the running API — a list that comes back empty leaves its routes skipped. */
export const discoverPublicParams = async (request: APIRequestContext): Promise<ScreenParams> => {
  const [tankSlug, clanTag, mapId, mode, streamerSlug, replayId, guideSlug, tournamentSlug, competitionSlug, coachId, tacticsId] = await Promise.all([
    firstOf(request, ['/tanks', '/vehicles'], ['slug']),
    firstOf(request, ['/clans'], ['tag']),
    firstOf(request, ['/maps'], ['slug', 'id']),
    firstOf(request, ['/modes'], ['mode']),
    firstOf(request, ['/streamers'], ['slug']),
    firstOf(request, ['/replays'], ['id']),
    firstOf(request, ['/community/guides'], ['slug']),
    firstOf(request, ['/community/tournaments'], ['slug']),
    firstOf(request, ['/competitions'], ['slug']),
    firstOf(request, ['/community/coaching/coaches'], ['userId', 'id']),
    firstOf(request, ['/tactics/boards'], ['id'])
  ]);

  return {
    tankSlug,
    clanTag,
    mapId,
    mode,
    streamerSlug,
    replayId,
    guideSlug,
    tournamentSlug,
    competitionSlug,
    coachId,
    tacticsId,
    ...(await discoverPlayer(request)),
    ...(await discoverMission(request))
  };
};

/** Params only a signed-in session can list: its own battles and overlays. */
export const discoverSignedInParams = async (request: APIRequestContext): Promise<ScreenParams> => {
  const [battleId, overlayId] = await Promise.all([
    firstOf(request, ['/me/analytics/battles'], ['id']),
    firstOf(request, ['/streamers/me/overlays'], ['publicId'])
  ]);

  return { battleId, overlayId };
};
