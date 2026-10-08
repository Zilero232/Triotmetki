export type PresenceTrackedRequest = {
  ip?: string;
};

export type IpQuotaSubjectInput = {
  ip: string | undefined;
  secret: string;
};

export type PresentAccountsInput = {
  accountIds: readonly number[];
  flags: readonly (string | null)[];
  hidden: ReadonlySet<bigint>;
};
