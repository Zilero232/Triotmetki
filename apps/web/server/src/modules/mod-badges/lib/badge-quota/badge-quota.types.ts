export type QuotaKeyInput = {
  prefix: string;
  subject: string;
  now: Date;
};

export type QuotaMembersInput = {
  accountIds: readonly number[];
  secret: string;
  now: Date;
};
