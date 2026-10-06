import type { DeltaDirection, HudTone } from '@/ui-kit';

import type { MarksPanelData } from '../../model/schemas';

export type LevelNeedView = { level: number; label: string; value: string; reached: boolean };

export type MarksGoalView = { label: string; need: number; reached: boolean };

export type MarksDamageView = { label: string; value: number; target: string; tone: HudTone };

export type MarksBarView = { fill: number; hold: number; tone: 'gold' | 'good' | 'text' };

export type MarksAverageView = { label: string; from: string; to: string; direction: DeltaDirection };

export type MarksPanelView = {
  text: string | null;
  look: 'box' | 'line';
  mark: string;
  stars: number;
  approx: boolean;
  percent: string;
  tone: HudTone;
  delta: string | null;
  deltaValue: number | null;
  deltaTone: HudTone;
  direction: DeltaDirection;
  start: number | null;
  projected: number | null;
  milestone: number;
  goal: LevelNeedView | null;
  target: MarksGoalView | null;
  bar: MarksBarView | null;
  thresholds: LevelNeedView[];
  showScaleLabels: boolean;
  damage: MarksDamageView | null;
  step: string | null;
  average: MarksAverageView | null;
  note: string | null;
};

export type LevelNeedInput = { level: number; need: number };

export type ToLabelInput = { data: MarksPanelData; level: number };

export type ShareInput = { value: number; end: number };
