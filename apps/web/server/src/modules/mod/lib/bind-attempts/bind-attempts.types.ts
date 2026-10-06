export type BindAttemptsInput = {
  requester: string;
  accountId: number | undefined;
};

export type BindAttemptCounter = {
  key: string;
  limit: number;
};
