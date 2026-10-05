export type ServerFiguresInput = {
  isPending: boolean;
  isError: boolean;
  trackedPlayers: number | null;
  online: number | null;
};

export type ServerFiguresState = 'empty' | 'error' | 'pending' | 'ready';

export type ActivityStaleInput = {
  activePlayers: number | null;
  lastActiveAt: string | null;
  now: Date | null;
};
