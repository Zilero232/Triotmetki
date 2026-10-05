import type { Prisma } from '../../../../../../generated';
import type { BattleStatsBlock } from '../../../../../lib/lesta';
import type {
  AccountSnapshotRowInput,
  BlockedTotalInput,
  BlockFields,
  BlockSource,
  ModeBlock,
  ShouldWriteSnapshotInput,
  TankDeltaInput,
  TankSnapshotRowInput
} from './snapshots.types';

import { careerSourceFromBlock } from '../career-source/career-source';

export const modeBlocks = (source: BlockSource): ModeBlock[] => {
  const blocks: ModeBlock[] = [{ mode: 'all', block: source.all }];

  if (source.random) {
    blocks.push({ mode: 'random', block: source.random });
  }

  return blocks;
};

export const shouldWriteSnapshot = ({ previous, battles }: ShouldWriteSnapshotInput): boolean => !previous || battles > previous.battles;

const blockFields = (block: BattleStatsBlock): BlockFields => ({
  battles: block.battles,
  wins: block.wins,
  losses: block.losses,
  draws: block.draws,
  damageDealt: block.damage_dealt,
  damageReceived: block.damage_received,
  frags: block.frags,
  spotted: block.spotted,
  xp: block.xp,
  survived: block.survived_battles,
  hits: block.hits,
  shots: block.shots,
  capturePoints: block.capture_points,
  droppedCapturePoints: block.dropped_capture_points,
  avgDamageBlocked: block.avg_damage_blocked ?? 0
});

export const accountSnapshotRow = ({
  accountId,
  capturedAt,
  mode,
  block,
  globalRating
}: AccountSnapshotRowInput): Prisma.AccountSnapshotCreateManyInput => {
  const fields = blockFields(block);

  return {
    ...fields,
    accountId,
    mode,
    capturedAt,
    damageDealt: BigInt(fields.damageDealt),
    damageReceived: BigInt(fields.damageReceived),
    xp: BigInt(fields.xp),
    ...careerSourceFromBlock(block),
    globalRating
  };
};

export const tankSnapshotRow = ({
  accountId,
  capturedAt,
  mode,
  block,
  stats,
  marksOnGun
}: TankSnapshotRowInput): Prisma.TankSnapshotCreateManyInput => ({
  ...blockFields(block),
  accountId,
  tankId: stats.tank_id,
  mode,
  capturedAt,
  markOfMastery: stats.mark_of_mastery,
  marksOnGun: marksOnGun ?? null,
  maxFrags: stats.max_frags ?? null,
  maxXp: stats.max_xp ?? null
});

const blockedTotal = (row: BlockedTotalInput): number => row.avgDamageBlocked * row.battles;

export const buildTankDelta = ({ previous, current, cohort, accountWinRate }: TankDeltaInput): Prisma.TankBattleDeltaCreateManyInput | null => {
  if (!previous || current.battles <= previous.battles) {
    return null;
  }

  return {
    accountId: current.accountId,
    tankId: current.tankId,
    mode: current.mode,
    capturedAt: current.capturedAt,
    cohort,
    accountWinRate,
    battles: current.battles - previous.battles,
    wins: current.wins - previous.wins,
    damageDealt: current.damageDealt - previous.damageDealt,
    damageBlocked: Math.max(0, Math.round(blockedTotal(current) - blockedTotal(previous))),
    frags: current.frags - previous.frags,
    spotted: current.spotted - previous.spotted,
    xp: current.xp - previous.xp,
    survived: current.survived - previous.survived,
    hits: current.hits - previous.hits,
    shots: current.shots - previous.shots,
    capturePoints: current.capturePoints - previous.capturePoints,
    droppedCapturePoints: current.droppedCapturePoints - previous.droppedCapturePoints
  };
};
