import { clamp } from 'remeda';

import type { DeltaDirection, HudTone } from '@/ui-kit';

import { formatNumber, formatPercent, NUMBER_FORMAT } from '@/shared/lib/format-number';
import { shiftColor } from '@/shared/lib/shift-color';

import type { MarksPanelData } from '../../model/schemas';
import type { LevelNeedView, MarksAverageView, MarksBarView, MarksDamageView, MarksGoalView, MarksPanelView } from './marks-panel-view.types';

import { MARKS_PANEL } from '../../config';

const levelLabel = (level: number): string => formatPercent({ value: level, digits: 0 });

const levelNeed = ({ level, need }: { level: number; need: number }): LevelNeedView => ({
  level,
  label: levelLabel(level),
  value: need > 0 ? formatNumber(need) : '',
  reached: need <= 0
});

export const percentText = (percent: number | null): string =>
  percent === null ? MARKS_PANEL.unknownPercent : formatPercent({ value: percent, digits: 2 });

export const deltaText = (delta: number | null): string | null =>
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

const toLabel = (data: MarksPanelData, level: number): string => [data.to, levelLabel(level)].filter(Boolean).join(' ');

const stepText = (step: MarksPanelData['step']): string | null =>
  step === null ? null : `${formatPercent({ value: step.step, digits: 1, signed: true })}: ${formatNumber(step.need)}`;

const averageView = (average: MarksPanelData['average']): MarksAverageView | null =>
  average === null
    ? null
    : {
        label: average.label,
        from: formatNumber(average.ema),
        to: formatNumber(average.ema_projected),
        direction: direction(average.ema_projected - average.ema)
      };

const battlesView = (data: MarksPanelData): MarksPanelView['battles'] =>
  data.battles === null ? null : { label: toLabel(data, data.battles.level), value: data.battles.text };

const damageView = (damage: MarksPanelData['damage']): MarksDamageView | null =>
  damage
    ? {
        label: damage.label,
        value: damage.value,
        target: `${MARKS_PANEL.separator}${formatNumber(damage.target)}`,
        tone: damage.value >= damage.target ? 'good' : 'text'
      }
    : null;

const targetView = (data: MarksPanelData): MarksGoalView | null => {
  if (data.goal === null) {
    return null;
  }

  const reached = data.goal.need <= 0;

  return { label: reached ? levelLabel(data.goal.level) : toLabel(data, data.goal.level), need: Math.max(data.goal.need, 0), reached };
};

const goalView = (data: MarksPanelData): LevelNeedView | null =>
  data.goal === null ? null : { ...levelNeed(data.goal), label: targetView(data)?.label ?? levelLabel(data.goal.level) };

const share = (value: number, end: number): number => clamp(value / end, { min: 0, max: 1 });

const barTone = (bar: NonNullable<MarksPanelData['bar']>): MarksBarView['tone'] => {
  if (bar.value >= bar.end) {
    return 'gold';
  }

  return bar.value >= bar.hold ? 'good' : 'text';
};

const barView = (bar: MarksPanelData['bar']): MarksBarView | null =>
  bar ? { fill: share(bar.value, bar.end), hold: share(bar.hold, bar.end), tone: barTone(bar) } : null;

const lookOf = (data: MarksPanelData): MarksPanelView['look'] => {
  if (data.style === 'minimal' || !data.has_curve) {
    return 'line';
  }

  return data.look === 'silhouette' ? 'silhouette' : 'box';
};

const startOf = ({ percent, delta }: MarksPanelData): number | null => (percent === null ? null : percent - (delta ?? 0));

const milestoneOf = (data: MarksPanelData): number => {
  const marks = MARKS_PANEL.levels.filter((level) => data.percent !== null && data.percent >= level).length;
  const goal = data.goal !== null && data.goal.need <= 0 ? 1 : 0;

  return marks * 2 + goal;
};

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
  deltaValue: data.delta,
  deltaTone: deltaTone(data.delta),
  direction: direction(data.delta),
  start: startOf(data),
  projected: data.percent,
  milestone: milestoneOf(data),
  fillColor: shiftColor({ delta: data.delta, span: MARKS_PANEL.shiftSpan }),
  silhouette: data.silhouette ?? null,
  next: data.next?.level ?? null,
  goal: goalView(data),
  target: targetView(data),
  bar: barView(data.bar ?? null),
  thresholds: data.thresholds.map(levelNeed),
  showScaleLabels: isDetailed(data),
  damage: damageView(data.damage ?? null),
  step: stepText(data.step),
  average: averageView(data.average),
  battles: battlesView(data),
  note: data.note
});
