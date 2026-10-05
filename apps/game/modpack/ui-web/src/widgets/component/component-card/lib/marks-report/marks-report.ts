import { fromUnixTime, isValid, lightFormat } from 'date-fns';
import { clamp } from 'remeda';

import { formatNumber, formatPercent, NUMBER_FORMAT } from '@/shared/lib/format-number';

import type { MarksReportView, RecordCardInput, ReportCard, ReportRow, ReportTone, UiMarksReport } from './marks-report.types';

import { MARKS_REPORT } from './marks-report.constants';

const plain = (text: string): string =>
  text.replaceAll(NUMBER_FORMAT.minus, MARKS_REPORT.glyphs.minus).replaceAll(NUMBER_FORMAT.thinSpace, MARKS_REPORT.glyphs.space);

const toneOf = (delta: number | null): ReportTone => {
  const change = delta ?? 0;

  if (change > 0) {
    return 'good';
  }

  return change < 0 ? 'bad' : 'muted';
};

const deltaText = (delta: number | null): string =>
  delta === null ? MARKS_REPORT.dash : plain(formatPercent({ value: delta, digits: 2, signed: true }));

const percentText = (value: number | null): string => (value === null ? MARKS_REPORT.dash : plain(formatPercent({ value, digits: 2 })));

const numberText = (value: number | null): string => plain(formatNumber(value ?? 0));

const reportDate = (seconds: number | null): string => {
  const date = seconds === null ? null : fromUnixTime(seconds);

  return date && isValid(date) ? lightFormat(date, MARKS_REPORT.dateFormat) : MARKS_REPORT.dash;
};

const chartOf = (values: number[]): MarksReportView['chart'] => {
  if (values.length < 2) {
    return null;
  }

  const { minBar, full } = MARKS_REPORT.chart;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, MARKS_REPORT.minSpan);
  const bars = values.map((value, index) => ({
    key: `bar-${index}`,
    height: `${Math.round(minBar + ((value - min) / span) * (full - minBar))}%`
  }));

  return { bars, min: percentText(min), max: percentText(max) };
};

const recordCard = ({ label, record }: RecordCardInput): ReportCard[] =>
  record ? [{ key: label, label, window: null, value: numberText(record.damage), delta: deltaText(record.delta), tone: toneOf(record.delta) }] : [];

const trendCard = (trend: UiMarksReport['trends'][number]): ReportCard => ({
  key: `trend-${trend.window}`,
  label: 'trend',
  window: trend.window,
  value: String(trend.battles),
  delta: deltaText(trend.delta),
  tone: toneOf(trend.delta)
});

const cardsOf = (report: UiMarksReport): ReportCard[] => [
  ...recordCard({ label: 'last', record: report.last }),
  ...recordCard({ label: 'best', record: report.best }),
  ...report.trends.map(trendCard)
];

export const marksReportView = (report: UiMarksReport): MarksReportView => ({
  percent: percentText(report.percent),
  progress: `${clamp(report.percent ?? 0, { min: 0, max: 100 })}%`,
  cards: cardsOf(report),
  rows: report.battles.map((battle, index): ReportRow => ({
    key: `${battle.t ?? index}-${index}`,
    date: reportDate(battle.t),
    damage: numberText(battle.damage),
    percent: percentText(battle.percent),
    delta: deltaText(battle.delta),
    tone: toneOf(battle.delta)
  })),
  chart: chartOf(report.chart)
});
