export type IngestQuotaKind = 'battles' | 'events';

export type IngestQuotaKeyInput = {
  kind: IngestQuotaKind;
  accountId: bigint;
  now: Date;
};
