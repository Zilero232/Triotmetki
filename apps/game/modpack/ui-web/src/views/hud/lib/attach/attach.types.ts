import type { Rect, Size } from '@/entities/hud/panel-layout';
import type { HudAttach } from '@/shared/api/hud-protocol';

export type AttachRectInput = { attach: HudAttach; size: Size; screen: Size };

export type AttachRule = (input: AttachRectInput) => Pick<Rect, 'left' | 'top'>;

export type StockBarInput = Omit<AttachRectInput, 'size'>;
