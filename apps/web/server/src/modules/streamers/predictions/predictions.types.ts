export type AccountTankInput = {
  accountId: bigint;
  tankId: number;
};

export type SettlePredictionInput = {
  userId: string;
  now: Date;
};
