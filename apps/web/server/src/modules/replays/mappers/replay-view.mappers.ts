import type { ReplayPlayer as ReplayPlayerView, ReplaySummary as ReplayView } from '@otmetki/schemas';

import { REPLAY_TAGS } from '@otmetki/schemas';
import { isIncludedIn } from 'remeda';

import type { ReplayPlayer } from '../../../lib/replay';
import type { ToReplayViewInput } from './replay-view.types';

import { REPLAY_LINKS } from '../config/links.constants';
import { toCount } from '../lib/count/count';
import { readStoredSummary } from '../lib/stored-summary/stored-summary';

const toPlayerView = (player: ReplayPlayer): ReplayPlayerView | null => {
  if (player.accountId === null || player.accountId <= 0 || player.tankId === null || player.tankId <= 0) {
    return null;
  }

  const { result } = player;

  return {
    accountId: player.accountId,
    nickname: player.name,
    clanTag: player.clanTag || null,
    team: Math.min(2, Math.max(1, player.team)),
    tankId: player.tankId,
    damageDealt: toCount(result?.damageDealt),
    frags: toCount(result?.frags),
    survived: result?.survived ?? null,
    vehicleId: player.vehicleId,
    vehicleType: player.vehicleType,
    maxHealth: toCount(player.maxHealth),
    isRecorder: player.isRecorder,
    damageAssisted: result ? toCount(result.assistRadio + result.assistTrack + result.assistStun) : null,
    assistRadio: toCount(result?.assistRadio),
    assistTrack: toCount(result?.assistTrack),
    assistStun: toCount(result?.assistStun),
    damageBlocked: toCount(result?.blocked),
    damageReceived: toCount(result?.damageReceived),
    spotted: toCount(result?.spotted),
    xp: toCount(result?.xp),
    shots: toCount(result?.shots),
    hits: toCount(result?.hits),
    penetrations: toCount(result?.penetrations),
    lifeTimeSec: toCount(result?.lifeTimeSeconds),
    killerVehicleId: result?.killerVehicleId ?? null
  };
};

export const toReplayView = ({ replay, apiUrl, viewerUserId = null }: ToReplayViewInput): ReplayView => {
  const summary = readStoredSummary(replay.summary);
  const players = (summary?.players ?? []).flatMap((player) => {
    const view = toPlayerView(player);

    return view ? [{ view, isRecorder: player.isRecorder }] : [];
  });

  return {
    id: replay.id,
    status: replay.status,
    visibility: replay.visibility,
    gameVersion: replay.gameVersion,
    arenaId: replay.arenaId,
    mapName: replay.mapName,
    battleType: replay.gameplayMode ?? replay.battleType,
    playedAt: replay.playedAt?.toISOString() ?? null,
    owner: players.find((player) => player.isRecorder)?.view ?? null,
    result: replay.result,
    damageDealt: replay.damageDealt,
    damageAssisted: replay.damageAssisted,
    frags: replay.frags,
    xp: replay.xp,
    medals: replay.medals,
    tags: replay.tags.filter((tag) => isIncludedIn(tag, REPLAY_TAGS)),
    players: players.map((player) => player.view),
    durationSec: summary?.durationSeconds === null || summary?.durationSeconds === undefined ? null : Math.round(summary.durationSeconds),
    views: replay.views,
    isOwner: viewerUserId !== null && replay.uploaderUserId === viewerUserId,
    downloadUrl: new URL(REPLAY_LINKS.file.replace('{id}', replay.id), apiUrl).href,
    createdAt: replay.createdAt.toISOString()
  };
};
