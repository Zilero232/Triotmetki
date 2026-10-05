import { HUD_TONE_COLORS } from '@/shared/config';

import type { CardStripProps } from './CardStrip.types';

import s from './CardStrip.module.scss';

export const CardStrip = ({ marks }: CardStripProps) => (
  <div className={s.strip}>
    {marks.map((tone, index) => (
      <span key={`${String(index)}-${tone}`} className={s.mark} style={{ backgroundColor: HUD_TONE_COLORS[tone].hex }} />
    ))}
  </div>
);
