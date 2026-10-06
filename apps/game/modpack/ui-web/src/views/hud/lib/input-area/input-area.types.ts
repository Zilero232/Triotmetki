import type { DragTarget, Rect, Size } from '@/entities/hud/panel-layout';
import type { InputArea } from '@/shared/api/gameface';

export type InputAreaOfInput = { whole: boolean; screen: Size; rects: Rect[] };

export type GrabbedTargetInput = { tracking: boolean; targets: DragTarget[]; hovered: string | null };

export type { InputArea };
