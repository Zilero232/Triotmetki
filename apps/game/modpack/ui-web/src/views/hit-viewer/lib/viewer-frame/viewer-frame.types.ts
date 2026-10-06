import type { ClientSize } from '@/shared/api/gameface';

export type ViewerFrameInput = { screen: ClientSize };

export type ViewerFrame = { scale: number; width: number; height: number };
