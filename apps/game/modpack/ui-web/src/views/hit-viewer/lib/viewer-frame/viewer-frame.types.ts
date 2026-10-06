import type { ClientSize, ViewRect } from '@/shared/api/gameface';

export type ViewerFrameInput = { screen: ClientSize; view: ViewRect | null };

export type ViewerFrame = { left: number; top: number; width: number; height: number; scale: number };
