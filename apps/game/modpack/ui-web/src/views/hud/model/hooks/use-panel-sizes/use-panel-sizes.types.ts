import type { HudPanel } from '@/shared/api/hud-protocol';

import type { PanelContent } from '../../../lib/panel-sizes';

export type MeasureRef = (element: HTMLElement | null) => void;

export type UsePanelSizesInput = PanelContent & { panels: HudPanel[] };
