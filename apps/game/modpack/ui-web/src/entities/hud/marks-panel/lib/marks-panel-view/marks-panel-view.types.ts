import type { DeltaDirection, HudTone } from '@/ui-kit';

export type LevelNeedView = { level: number; label: string; value: string; reached: boolean };

export type MarksGoalView = { label: string; need: number; reached: boolean };

export type MarksDamageView = { label: string; value: number; target: string; tone: HudTone };

export type MarksBarView = { fill: number; hold: number; tone: 'gold' | 'good' | 'text' };

export type MarksAverageView = { label: string; from: string; to: string; direction: DeltaDirection };

export type MarksPanelView = {
  text: string | null;
  look: 'box' | 'line' | 'silhouette';
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
  fillColor: string;
  silhouette: string | null;
  next: number | null;
  goal: LevelNeedView | null;
  target: MarksGoalView | null;
  bar: MarksBarView | null;
  thresholds: LevelNeedView[];
  showScaleLabels: boolean;
  damage: MarksDamageView | null;
  step: string | null;
  average: MarksAverageView | null;
  battles: { label: string; value: string } | null;
  note: string | null;
};
