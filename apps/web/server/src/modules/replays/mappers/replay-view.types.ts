import type { Replay } from '../../../../generated';

export type ReplayRow = Pick<
  Replay,
  | 'arenaId'
  | 'battleType'
  | 'createdAt'
  | 'damageAssisted'
  | 'damageDealt'
  | 'frags'
  | 'gameplayMode'
  | 'gameVersion'
  | 'id'
  | 'mapName'
  | 'medals'
  | 'playedAt'
  | 'result'
  | 'status'
  | 'summary'
  | 'tags'
  | 'uploaderUserId'
  | 'views'
  | 'visibility'
  | 'xp'
>;

export type ToReplayViewInput = {
  replay: ReplayRow;
  apiUrl: string;
  viewerUserId?: string | null;
};
