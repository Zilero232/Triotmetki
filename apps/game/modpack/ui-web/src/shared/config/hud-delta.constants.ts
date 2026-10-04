import { HUD_FIGURE } from './hud-figure.constants';

export const HUD_DELTA = {
  up: { path: HUD_FIGURE.triangleUp, tone: 'good' },
  down: { path: HUD_FIGURE.triangleDown, tone: 'bad' },
  flat: { path: null, tone: 'muted' }
} as const;
