import type { HudPanel } from '@/shared/api/hud-protocol';

import type { ElementRef, PanelContent } from '../../../lib/panel-sizes';

export type MeasureRef = ElementRef;

export type UsePanelSizesInput = PanelContent & { panels: HudPanel[] };
