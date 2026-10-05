import { tankLevelOf } from '@otmetki/schemas';

import type { Battle, PlayerTank, PlaySession } from '../../../../generated';
import type {
  AccountExport,
  BattleExport,
  SessionExport,
  TankExport,
  TankProgressExport,
  TankProgressRow,
  ToAccountExportInput
} from './data-export.types';

import { toIsoDate, toNumber } from '../../../common/lib';

export const toAccountExport = ({ player, snapshot }: ToAccountExportInput): AccountExport => ({
  accountId: toNumber(player.accountId),
  nickname: player.nickname,
  createdAt: player.createdAt?.toISOString() ?? null,
  lastBattleAt: player.lastBattleAt?.toISOString() ?? null,
  overall: snapshot
    ? {
        capturedAt: snapshot.capturedAt.toISOString(),
        battles: snapshot.battles,
        wins: snapshot.wins,
        losses: snapshot.losses,
        draws: snapshot.draws,
        damageDealt: toNumber(snapshot.damageDealt),
        damageReceived: toNumber(snapshot.damageReceived),
        frags: snapshot.frags,
        spotted: snapshot.spotted,
        xp: toNumber(snapshot.xp),
        survived: snapshot.survived,
        hits: snapshot.hits,
        shots: snapshot.shots,
        capturePoints: snapshot.capturePoints,
        droppedCapturePoints: snapshot.droppedCapturePoints,
        globalRating: snapshot.globalRating
      }
    : null
});

export const toTankExport = (tank: PlayerTank): TankExport => ({
  accountId: toNumber(tank.accountId),
  tankId: tank.tankId,
  battles: tank.battles,
  wins: tank.wins,
  markOfMastery: tank.markOfMastery,
  marksOnGun: tank.marksOnGun,
  lastBattleAt: tank.lastBattleAt?.toISOString() ?? null
});

export const toSessionExport = (session: PlaySession): SessionExport => ({
  accountId: toNumber(session.accountId),
  source: session.source,
  kind: session.kind,
  day: toIsoDate(session.day),
  startedAt: session.startedAt.toISOString(),
  endedAt: session.endedAt?.toISOString() ?? null,
  battles: session.battles,
  wins: session.wins,
  losses: session.losses,
  damageDealt: session.damageDealt,
  damageAssisted: session.damageAssisted,
  damageBlocked: session.damageBlocked,
  frags: session.frags,
  spotted: session.spotted,
  xp: session.xp,
  survived: session.survived,
  wn8: session.wn8,
  broneIndex: session.broneIndex
});

export const toBattleExport = (battle: Battle): BattleExport => ({
  accountId: toNumber(battle.accountId),
  arenaUniqueId: battle.arenaUniqueId.toString(),
  tankId: battle.tankId,
  arenaId: battle.arenaId,
  battleType: battle.battleType,
  result: battle.result,
  damageDealt: battle.damageDealt,
  damageAssistedRadio: battle.damageAssistedRadio,
  damageAssistedTrack: battle.damageAssistedTrack,
  damageBlocked: battle.damageBlocked,
  damageReceived: battle.damageReceived,
  spotted: battle.spotted,
  frags: battle.frags,
  xp: battle.xp,
  credits: battle.credits,
  survived: battle.survived,
  moePercent: battle.moePercent,
  moePercentDelta: battle.moePercentDelta,
  startedAt: battle.startedAt.toISOString()
});

export const toTankProgressExport = (row: TankProgressRow): TankProgressExport => ({
  accountId: toNumber(row.accountId),
  tankId: row.tankId,
  level: tankLevelOf(row.progressXp).level,
  xp: row.progressXp,
  battles: row.progressBattles
});
