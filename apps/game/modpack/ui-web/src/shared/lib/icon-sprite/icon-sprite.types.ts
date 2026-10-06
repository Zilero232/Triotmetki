import type { UI_ICON_NAMES, UI_ICON_TONES } from '../../config';

export type UiIconName = (typeof UI_ICON_NAMES)[number];

export type UiIconTone = (typeof UI_ICON_TONES)[number];

export type SpriteCellInput = {
  name: UiIconName;
  tone: UiIconTone;
};

export type SpriteStyleInput = SpriteCellInput & {
  size: number;
};
