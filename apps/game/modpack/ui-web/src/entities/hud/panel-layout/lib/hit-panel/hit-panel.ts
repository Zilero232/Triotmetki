import { findLast } from 'remeda';

import type { Point } from '../..';
import type { ContainsInput, HitPanelInput, HitTarget, PanelUnderInput, PointerPointInput, TargetAtInput } from './hit-panel.types';

const contains = ({ target: { rect }, point: { x, y } }: ContainsInput): boolean =>
  x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;

export const hitPanel = ({ targets, point, pointer = false }: HitPanelInput): HitTarget | null =>
  findLast(targets, (target) => (target.movable || (pointer && target.pointer)) && contains({ target, point })) ?? null;

export const panelUnder = <Target extends HitTarget>({ targets, point }: PanelUnderInput<Target>): Target | null =>
  findLast(targets, (target) => contains({ target, point })) ?? null;

export const pointerPoint = ({ clientX, clientY, scale }: PointerPointInput): Point => ({
  x: clientX / (scale > 0 ? scale : 1),
  y: clientY / (scale > 0 ? scale : 1)
});

export const targetAt = <Target extends HitTarget>({ targets, press, scale }: TargetAtInput<Target>): Target | null => {
  const hit = hitPanel({ targets, point: pointerPoint({ clientX: press.clientX, clientY: press.clientY, scale }) });

  return targets.find((target) => target.id === hit?.id) ?? null;
};
