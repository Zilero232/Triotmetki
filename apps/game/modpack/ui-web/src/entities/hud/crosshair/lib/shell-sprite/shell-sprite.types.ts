import type { RETICLE_SHELLS } from '../../config';

export type ShellSpriteKind = (typeof RETICLE_SHELLS.sprite.kinds)[number];

export type ShellSpritePaint = (typeof RETICLE_SHELLS.sprite.paints)[number];

export type ShellSpriteCellInput = {
  kind: ShellSpriteKind | null;
  paint: ShellSpritePaint;
};

export type ShellSpriteCell = {
  column: number;
  row: number;
};

export type ShellSpriteStyleInput = ShellSpriteCellInput & {
  width: number;
  height: number;
};

export type ShellSpriteStyle = {
  width: string;
  height: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
};
