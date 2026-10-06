import type { Point, Rect } from '../..';

export type HitTarget = { id: string; rect: Rect; button: boolean; movable: boolean; pointer: boolean };

export type DragTarget = HitTarget & { scale: number };

export type HitPanelInput = { targets: HitTarget[]; point: Point; pointer?: boolean };

export type PanelUnderInput<Target extends HitTarget> = { targets: Target[]; point: Point };

export type PointerPointInput = { clientX: number; clientY: number; scale: number };

export type TargetAtInput<Target extends HitTarget> = { targets: Target[]; press: Pick<MouseEvent, 'clientX' | 'clientY'>; scale: number };

export type ContainsInput = { target: HitTarget; point: Point };
