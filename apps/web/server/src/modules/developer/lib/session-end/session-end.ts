import type { SessionEndedInput } from './session-end.types';

const hasLoggedOutSince = ({ lastActivityAt, logoutAt }: Pick<SessionEndedInput, 'lastActivityAt' | 'logoutAt'>): boolean =>
  logoutAt !== null && logoutAt.getTime() > lastActivityAt.getTime();

export const isSessionEnded = ({ lastActivityAt, logoutAt, idleSince }: SessionEndedInput): boolean =>
  lastActivityAt.getTime() < idleSince.getTime() || hasLoggedOutSince({ lastActivityAt, logoutAt });
