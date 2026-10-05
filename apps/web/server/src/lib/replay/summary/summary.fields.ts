import { fromUnixTime } from 'date-fns';
import { sumBy } from 'remeda';

import type { ArenaBlock, PersonalResult, VehicleResult } from '../header/header.types';
import type { ClientVersion, PlayerResult, ReplayGame } from './summary.types';

import { personalResultSchema } from '../header/header.schemas';
import { GAME_TITLE, REPLAY_PATTERN, VEHICLE_RESULT } from './summary.constants';

export const blankToNull = (value: string | null | undefined) => value || null;

export const masteryOf = (value: number | null | undefined): number | null =>
  value !== null &&
  value !== undefined &&
  Number.isInteger(value) &&
  value >= VEHICLE_RESULT.masteryRange.min &&
  value <= VEHICLE_RESULT.masteryRange.max
    ? value
    : null;

export const detectGame = (clientVersionFromXml: string | null | undefined): ReplayGame => {
  if (!clientVersionFromXml) {
    return 'unknown';
  }

  if (GAME_TITLE.lesta.test(clientVersionFromXml)) {
    return 'lesta';
  }

  if (GAME_TITLE.wg.test(clientVersionFromXml)) {
    return 'wg';
  }

  return 'unknown';
};

export const parseClientVersion = (arena: ArenaBlock): ClientVersion => {
  const xml = blankToNull(arena.clientVersionFromXml);
  const exe = blankToNull(arena.clientVersionFromExe);
  const xmlVersion = xml?.split(/\s+/).find((part) => part.startsWith('v.'));
  const match = REPLAY_PATTERN.clientVersion.exec(xmlVersion ?? exe ?? '');

  if (!match) {
    return { xml, exe, numbers: null, label: null };
  }

  const numbers: [number, number, number, number] = [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0), Number(match[4] ?? 0)];

  return { xml, exe, numbers, label: numbers.join('.') };
};

export const parseDateTime = (value: string | null | undefined) => {
  const match = REPLAY_PATTERN.dateTime.exec(value ?? '');

  if (!match) {
    return null;
  }

  const [, day, month, year, hours, minutes, seconds] = match;

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const unixToIso = (seconds: number | null | undefined) => {
  if (!seconds) {
    return null;
  }

  return fromUnixTime(seconds).toISOString();
};

export const findPersonalResult = (personal: Record<string, unknown> | null | undefined): PersonalResult | null => {
  if (!personal) {
    return null;
  }

  for (const [key, value] of Object.entries(personal)) {
    if (key === 'avatar') {
      continue;
    }

    const parsed = personalResultSchema.safeParse(value);

    if (parsed.success) {
      return parsed.data;
    }
  }

  return null;
};

export const toPlayerResult = (entries: VehicleResult[]): PlayerResult | null => {
  const [first] = entries;

  if (!first) {
    return null;
  }

  const sum = (pick: (entry: VehicleResult) => number | null | undefined) => sumBy(entries, (entry) => pick(entry) ?? 0);

  const last = entries.at(-1) ?? first;
  const health = last.health ?? null;
  const survived =
    last.deathReason === null || last.deathReason === undefined ? (health ?? 0) > 0 : last.deathReason === VEHICLE_RESULT.aliveDeathReason;

  return {
    damageDealt: sum((entry) => entry.damageDealt),
    assistRadio: sum((entry) => entry.damageAssistedRadio),
    assistTrack: sum((entry) => entry.damageAssistedTrack),
    assistStun: sum((entry) => entry.damageAssistedStun),
    blocked: sum((entry) => entry.damageBlockedByArmor),
    damageReceived: sum((entry) => entry.damageReceived),
    spotted: sum((entry) => entry.spotted),
    frags: sum((entry) => entry.kills),
    teamKills: sum((entry) => entry.tkills),
    xp: sum((entry) => entry.xp),
    credits: sum((entry) => entry.credits),
    shots: sum((entry) => entry.shots),
    hits: sum((entry) => entry.directEnemyHits ?? entry.directHits),
    penetrations: sum((entry) => entry.piercings),
    capturePoints: sum((entry) => entry.capturePoints),
    defencePoints: sum((entry) => entry.droppedCapturePoints),
    lifeTimeSeconds: sum((entry) => entry.lifeTime),
    health,
    survived,
    killerVehicleId: last.killerID ? last.killerID : null
  };
};
