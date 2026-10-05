import type { ClientSize } from '@/shared/api/gameface';
import type { UiPanel } from '@/shared/api/protocol';

export type Size = ClientSize;

export type Point = { x: number; y: number };

export type Rect = { left: number; top: number; width: number; height: number };

export type StageBox = Record<keyof Rect, string>;

type AlignX = UiPanel['align_x'];
type AlignY = UiPanel['align_y'];

export type Placement = { x: number; y: number; align_x: AlignX; align_y: AlignY };

export type LiveRect = { id: string; rect: Rect };

export type Drag = LiveRect & { mouseX: number; mouseY: number; scale: number };

export type PanelRectInput = { panel: Pick<UiPanel, 'align_x' | 'align_y' | 'height' | 'width' | 'x' | 'y'>; screen: Size };

export type RectOnScreen = { rect: Rect; screen: Size };

export type ScaleInput = { screen: Size; stage: Size };

export type DragInput = { rect: Rect; dx: number; dy: number; screen: Size; grid: number };

export type DragToInput = { drag: Drag; pointer: Point; screen: Size; grid: number };

export type MoveMessageInput = LiveRect & { screen: Size };

export type AnchorInput = { align: AlignX | AlignY; size: number; extent: number };

export type ThirdInput = { center: number; extent: number };

export type PastSlopInput = { from: Point; to: Point; slop: number };

export type PercentInput = { value: number; extent: number };

export type Step = { dx: number; dy: number };

export type NudgeSteps = Partial<Record<string, Step>>;
