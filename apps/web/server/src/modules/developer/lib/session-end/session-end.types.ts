export type SessionEndedInput = {
  lastActivityAt: Date;
  logoutAt: Date | null;
  idleSince: Date;
};
