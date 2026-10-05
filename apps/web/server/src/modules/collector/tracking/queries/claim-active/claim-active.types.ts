export type ClaimActiveInput = {
  now: Date;
  nextPollAt: Date;
  limit: number;
};

export type ClaimedAccountRow = {
  accountId: bigint;
};
