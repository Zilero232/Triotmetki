import type { Battle, TankBattleDelta } from '../../../../generated';
import type { API_DELTA_SUM, MOD_BATTLE_SUM } from './goal-window.selects';

type Sums<Row, Field extends keyof Row> = { [Key in Field]: Row[Key] | null };

export type ModBattleGroup = Pick<Battle, 'result' | 'tankId'> & {
  _count: { _all: number };
  _sum: Sums<Battle, keyof typeof MOD_BATTLE_SUM>;
};

export type ApiDeltaGroup = Pick<TankBattleDelta, 'tankId'> & {
  _sum: Sums<TankBattleDelta, keyof typeof API_DELTA_SUM>;
};
