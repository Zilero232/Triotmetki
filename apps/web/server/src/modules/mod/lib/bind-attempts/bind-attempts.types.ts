export type BindAttemptsInput = {
  requester: string;
  accountId: number | undefined;
};

export type BindAttemptCounter = {
  key: string;
  limit: number;
};

export type BindAttemptCounters = {
  requester: BindAttemptCounter;
  account: BindAttemptCounter | null;
};
