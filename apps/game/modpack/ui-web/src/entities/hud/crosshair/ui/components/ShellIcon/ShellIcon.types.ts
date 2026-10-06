import type { ShellSpritePaint } from '../../../lib/shell-sprite';
import type { ShellKind } from '../../../model/schemas';

export type ShellPaint = ShellSpritePaint;

export type ShellIconProps = {
  kind: ShellKind | null;
  paint: ShellPaint;
  width: number;
  height: number;
};
