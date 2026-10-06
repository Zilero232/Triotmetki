import { fromUnixTime, isValid, lightFormat } from 'date-fns';
import { clamp } from 'remeda';

import { deltaText, formatNumber, NUMBER_FORMAT, percentText, trendOf } from '@/shared/lib/format-number';

import type { MarksReportView, RecordCardInput, ReportCard, ReportRow, ReportTone, UiMarksReport } from './marks-report.types';

import { MARKS_REPORT } from '../../config';

const plain = (text: string): string =>
  text.replaceAll(NUMBER_FORMAT.minus, MARKS_REPORT.glyphs.minus).replaceAll(NUMBER_FORMAT.thinSpace, MARKS_REPORT.glyphs.space);

const toneOf = (delta: number | null): ReportTone => MARKS_REPORT.trendTones[trendOf(delta)];

const reportDelta = (delta: number | null): string => plain(deltaText({ value: delta }) ?? MARKS_REPORT.dash);

const reportPercent = (value: number | null): string => plain(percentText(value));

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

  return { bars, min: reportPercent(min), max: reportPercent(max) };
};

const recordCard = ({ label, record }: RecordCardInput): ReportCard[] =>
  record ? [{ key: label, label, window: null, value: numberText(record.damage), delta: reportDelta(record.delta), tone: toneOf(record.delta) }] : [];

const trendCard = (trend: UiMarksReport['trends'][number]): ReportCard => ({
  key: `trend-${trend.window}`,
  label: 'trend',
  window: trend.window,
  value: String(trend.battles),
  delta: reportDelta(trend.delta),
  tone: toneOf(trend.delta)
});

const cardsOf = (report: UiMarksReport): ReportCard[] => [
  ...recordCard({ label: 'last', record: report.last }),
  ...recordCard({ label: 'best', record: report.best }),
  ...report.trends.map(trendCard)
];

export const marksReportView = (report: UiMarksReport): MarksReportView => ({
  percent: reportPercent(report.percent),
  progress: `${clamp(report.percent ?? 0, { min: 0, max: 100 })}%`,
  cards: cardsOf(report),
  rows: report.battles.map((battle, index): ReportRow => ({
    key: `${battle.t ?? index}-${index}`,
    date: reportDate(battle.t),
    damage: numberText(battle.damage),
    percent: reportPercent(battle.percent),
    delta: reportDelta(battle.delta),
    tone: toneOf(battle.delta)
  })),
  chart: chartOf(report.chart)
});
