import type { ShellKind } from '../../../model/schemas';

export type ShellPaint = 'gold' | 'loaded' | 'refill' | 'spent';

export type ShellIconProps = {
  kind: ShellKind | null;
  paint: ShellPaint;
  width: number;
  height: number;
};
