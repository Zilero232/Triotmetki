import type { ArmorReadoutData } from '@/entities/armor/armor-map';

import type { CardPlace } from '../../../lib/screen-point';

export type HoverCardProps = { place: CardPlace; readout: ArmorReadoutData };
