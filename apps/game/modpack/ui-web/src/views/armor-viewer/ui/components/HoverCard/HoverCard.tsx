import { ArmorReadout } from '@/entities/armor/armor-map';

import type { HoverCardProps } from './HoverCard.types';

import s from './HoverCard.module.scss';

export const HoverCard = ({ place, readout }: HoverCardProps) => (
  <div className={s.card} style={place}>
    <ArmorReadout readout={readout} />
  </div>
);
