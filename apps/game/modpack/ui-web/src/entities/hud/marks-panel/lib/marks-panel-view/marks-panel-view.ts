import type { DeltaDirection, HudTone } from '@/ui-kit';

import { formatNumber, formatPercent, NUMBER_FORMAT } from '@/shared/lib/format-number';
import { shiftColor } from '@/shared/lib/shift-color';

import type { MarksPanelData } from '../../model/schemas';
import type { LevelNeedView, MarksDamageView, MarksPanelView } from './marks-panel-view.types';

import { MARKS_PANEL } from '../../config';

const levelLabel = (level: number): string => formatPercent({ value: level, digits: 0 });

const levelNeed = ({ level, need }: { level: number; need: number }): LevelNeedView => ({
  level,
  label: levelLabel(level),
  value: need > 0 ? formatNumber(need) : '',
  reached: need <= 0
});

const percentText = (percent: number | null): string =>
  percent === null ? MARKS_PANEL.unknownPercent : formatPercent({ value: percent, digits: 2 });

const deltaText = (delta: number | null): string | null =>
  delta === null ? null : formatPercent({ value: delta, digits: 2, signed: true }).replace(`${NUMBER_FORMAT.thinSpace}%`, '');

const trendOf = (delta: number | null): keyof typeof MARKS_PANEL.deltaTones => {
  const change = delta ?? 0;

  if (change > 0) {
    return 'rising';
  }

  return change < 0 ? 'falling' : 'flat';
};

const deltaTone = (delta: number | null): HudTone => MARKS_PANEL.deltaTones[trendOf(delta)];

const direction = (delta: number | null): DeltaDirection => MARKS_PANEL.directions[trendOf(delta)];

const stepText = (step: MarksPanelData['step']): string | null =>
  step === null ? null : `${formatPercent({ value: step.step, digits: 1, signed: true })}: ${formatNumber(step.need)}`;

const averageView = (average: MarksPanelData['average']): MarksPanelView['average'] =>
  average === null
    ? null
    : { label: average.label, value: `${formatNumber(average.ema)} ${MARKS_PANEL.arrow} ${formatNumber(average.ema_projected)}` };

const battlesView = (battles: MarksPanelData['battles']): MarksPanelView['battles'] =>
  battles === null ? null : { label: levelLabel(battles.level), value: battles.text };

const damageView = (damage: MarksPanelData['damage']): MarksDamageView | null =>
  damage
    ? {
        label: damage.label,
        value: formatNumber(damage.value),
        target: `${MARKS_PANEL.separator}${formatNumber(damage.target)}`,
        tone: damage.value >= damage.target ? 'good' : 'text'
      }
    : null;

const lookOf = (data: MarksPanelData): MarksPanelView['look'] => {
  if (data.style === 'minimal' || !data.has_curve) {
    return 'line';
  }

  return data.look === 'silhouette' ? 'silhouette' : 'box';
};

const startOf = ({ percent, delta }: MarksPanelData): number | null => (percent === null ? null : percent - (delta ?? 0));

const isDetailed = (data: MarksPanelData): boolean => data.style === 'extended' || data.thresholds.length > 0;

export const marksPanelView = (data: MarksPanelData): MarksPanelView => ({
  text: data.style === 'custom' ? data.text : null,
  look: lookOf(data),
  mark: data.mark ?? MARKS_PANEL.fallbackMark,
  stars: data.stars ?? 0,
  approx: data.estimated,
  percent: percentText(data.percent),
  tone: data.tone,
  delta: deltaText(data.delta),
  deltaTone: deltaTone(data.delta),
  direction: direction(data.delta),
  start: startOf(data),
  projected: data.percent,
  fillColor: shiftColor({ delta: data.delta, span: MARKS_PANEL.shiftSpan }),
  silhouette: data.silhouette ?? null,
  next: data.next?.level ?? null,
  goal: data.goal === null ? null : levelNeed(data.goal),
  thresholds: data.thresholds.map(levelNeed),
  showScaleLabels: isDetailed(data),
  damage: isDetailed(data) ? damageView(data.damage ?? null) : null,
  step: stepText(data.step),
  average: averageView(data.average),
  battles: battlesView(data.battles),
  note: data.note
});
