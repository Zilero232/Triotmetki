import type { RETICLE_SHELLS } from '../../config';

export type ShellSpriteKind = (typeof RETICLE_SHELLS.sprite.kinds)[number];

export type ShellSpritePaint = (typeof RETICLE_SHELLS.sprite.paints)[number];

export type ShellSpriteCellInput = {
  kind: ShellSpriteKind | null;
  paint: ShellSpritePaint;
};

export type ShellSpriteStyleInput = ShellSpriteCellInput & {
  width: number;
  height: number;
};
