import type { TankTotals } from '@otmetki/ratings';

import type { ApiDeltaGroup, ModBattleGroup } from '../selects/goal-window.types';

export const toModTankTotals = ({ tankId, result, _count, _sum }: ModBattleGroup): TankTotals => ({
  tankId,
  battles: _count._all,
  wins: result === 'win' ? _count._all : 0,
  damageDealt: _sum.damageDealt ?? 0,
  frags: _sum.frags ?? 0,
  spotted: _sum.spotted ?? 0,
  capturePoints: _sum.capturePoints ?? 0,
  droppedCapturePoints: _sum.droppedCapturePoints ?? 0
});

export const toApiTankTotals = ({ tankId, _sum }: ApiDeltaGroup): TankTotals => ({
  tankId,
  battles: _sum.battles ?? 0,
  wins: _sum.wins ?? 0,
  damageDealt: _sum.damageDealt ?? 0,
  frags: _sum.frags ?? 0,
  spotted: _sum.spotted ?? 0,
  capturePoints: _sum.capturePoints ?? 0,
  droppedCapturePoints: _sum.droppedCapturePoints ?? 0
});
