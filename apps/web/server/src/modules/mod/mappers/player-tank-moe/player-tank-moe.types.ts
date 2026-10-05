import type { BattleResultEvent } from '../../lib/contract';

export type MoeValues = NonNullable<BattleResultEvent['moe']>;

export type ToPlayerTankMoeInput = {
  moe: MoeValues;
  previousMarks: number | null | undefined;
};
