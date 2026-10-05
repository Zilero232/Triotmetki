import type { HudMessageOf } from '@/shared/api/hud-protocol';

export type HudMouseEvent = HudMessageOf<'mouse'>['event'];

export type MouseReport = (event: HudMouseEvent) => void;
