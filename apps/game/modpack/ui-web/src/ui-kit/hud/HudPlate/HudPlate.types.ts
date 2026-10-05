import type { ReactNode } from 'react';

import type { HUD_PLATE_FILLS } from './HudPlate.constants';

export type HudPlateFill = (typeof HUD_PLATE_FILLS)[number];

export type HudPlateProps = { fill?: HudPlateFill; className?: string; children: ReactNode };
