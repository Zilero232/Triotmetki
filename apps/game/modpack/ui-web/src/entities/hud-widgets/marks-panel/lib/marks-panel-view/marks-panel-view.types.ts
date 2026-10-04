import type { DeltaDirection, HudTone } from '../../../../../shared/ui/hud';

export type LevelNeedView = { level: number; label: string; value: string; reached: boolean };

export type MarksDamageView = { label: string; value: string; target: string; tone: HudTone };

export type MarksPanelView = {
  text: string | null;
  look: 'box' | 'line' | 'silhouette';
  mark: string;
  stars: number;
  approx: boolean;
  percent: string;
  tone: HudTone;
  delta: string | null;
  deltaTone: HudTone;
  direction: DeltaDirection;
  start: number | null;
  projected: number | null;
  fillColor: string;
  silhouette: string | null;
  next: number | null;
  goal: LevelNeedView | null;
  thresholds: LevelNeedView[];
  showScaleLabels: boolean;
  damage: MarksDamageView | null;
  step: string | null;
  average: { label: string; value: string } | null;
  battles: { label: string; value: string } | null;
  note: string | null;
};
