import type { Drag, DragTarget, HitTarget, Placement } from '@/entities/hud/panel-layout';
import type { ClientSize } from '@/shared/api/gameface';

export type OverlayDrag = Drag & { moved: boolean; button: boolean };

export type PanelPress = Pick<MouseEvent, 'clientX' | 'clientY'>;

export type DragMotionInput = { drag: OverlayDrag; press: PanelPress; screen: ClientSize };

export type DragOutcome = { kind: 'moved'; placement: Placement } | { kind: 'pressed' } | { kind: 'still' };

export type PressDragInput = { target: HitTarget; press: PanelPress; scale: number };

export type PressedTargetInput = { edit: boolean; targets: DragTarget[]; press: Pick<MouseEvent, 'button' | 'clientX' | 'clientY'> };
