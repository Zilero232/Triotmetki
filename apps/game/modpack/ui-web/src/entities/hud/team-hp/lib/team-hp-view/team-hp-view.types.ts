import type { CSSProperties } from 'react';

import type { HudTone } from '@/ui-kit';

import type { TeamHpData, TeamHpVehicle } from '../../model/schemas';

export type TeamHpSegment = { kind: 'segment'; key: string; width: number; fill: number; alive: boolean };

export type TeamHpGap = { kind: 'gap'; key: string };

export type TeamHpStripVehicle = { kind: 'vehicle'; key: string; icon: TeamHpVehicle['icon']; alive: boolean };

export type TeamHpTierLabel = { kind: 'tier'; key: string; label: string };

export type TeamHpPaint = { tone: HudTone | null; text: CSSProperties | undefined; fill: CSSProperties | undefined };

export type TeamHpSideView = {
  hp: string;
  behind: boolean;
  hpTone: HudTone | null;
  hpStyle: CSSProperties | undefined;
  fill: number;
  segments: (TeamHpGap | TeamHpSegment)[];
  strip: (TeamHpStripVehicle | TeamHpTierLabel)[];
  paint: TeamHpPaint;
};

export type TeamHpScore = { allies: string; enemies: string };

export type TeamHpView = {
  numbers: boolean;
  bars: boolean;
  segmented: boolean;
  strip: boolean;
  secondRow: boolean;
  score: TeamHpScore | null;
  diff: string | null;
  diffTone: HudTone;
  hasCenter: boolean;
  allies: TeamHpSideView;
  enemies: TeamHpSideView;
};

export type SideViewInput = {
  side: TeamHpData['allies'];
  other: TeamHpData['allies'];
  vehicles: TeamHpVehicle[];
  tone: HudTone;
  color: string | null;
  mirrored: boolean;
};

export type BehindInput = Pick<SideViewInput, 'other' | 'side'>;

export type PaintInput = { tone: HudTone; color: string | null };

export type TierGroupInput = { vehicle: TeamHpVehicle; index: number };
