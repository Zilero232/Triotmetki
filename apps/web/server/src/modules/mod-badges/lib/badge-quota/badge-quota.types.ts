export type QuotaKeyInput = {
  deviceId: string;
  now: Date;
};

export type QuotaMembersInput = {
  accountIds: readonly number[];
  secret: string;
  now: Date;
};
