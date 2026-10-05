import type { BattleResultEvent } from '../lib/contract/contract.types';

export type BattleDataInput = {
  event: BattleResultEvent;
  accountId: bigint;
  deviceId: string;
  sessionId: string | null;
  previousMoePercent: number | null;
};

export type ModShot = NonNullable<BattleResultEvent['shots']>[number];

export type MoeValues = NonNullable<BattleResultEvent['moe']>;

export type ToPlayerTankMoeInput = {
  moe: MoeValues;
  previousMarks: number | null | undefined;
};
