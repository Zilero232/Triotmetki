import type { ReticleArcsData } from '../../model/schemas';

export type ArcSide = 'left' | 'right';

export type ArcPathInput = {
  side: ArcSide;
  progress: number;
  centre: number;
};

export type ArcViewInput = { side: ArcSide; progress: number | null; centre: number };

export type ArcView = { d: string; isShown: boolean };

export type ArcsViewInput = { arcs: ReticleArcsData | null; centre: number };

export type ArcsView = { isIdle: boolean; leftTrack: string; rightTrack: string; reload: ArcView; health: ArcView };
