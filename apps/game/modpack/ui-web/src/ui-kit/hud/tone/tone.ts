import type { HudTone } from './tone.types';

import s from './Tone.module.scss';

export const toneClass = (tone: HudTone | null | undefined): string | undefined => (tone ? s[tone] : undefined);
