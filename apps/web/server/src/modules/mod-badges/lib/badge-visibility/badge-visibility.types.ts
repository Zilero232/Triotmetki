export type ReportedDevice = {
  accountId: bigint | null;
  badgeVisible: boolean | null;
};

export type VisibleAccountsInput = {
  devices: ReportedDevice[];
  hidden: Set<bigint>;
};
