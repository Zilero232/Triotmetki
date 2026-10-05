import type { UiMarksReport } from '@/shared/api/protocol';

export type ReportTone = 'bad' | 'good' | 'muted';

export type ReportCard = { key: string; label: 'best' | 'last' | 'trend'; window: number | null; value: string; delta: string; tone: ReportTone };

export type ReportRow = { key: string; date: string; damage: string; percent: string; delta: string; tone: ReportTone };

export type MarksReportView = {
  percent: string;
  progress: string;
  cards: ReportCard[];
  rows: ReportRow[];
  chart: { bars: { key: string; height: string }[]; min: string; max: string } | null;
};

export type RecordCardInput = { label: 'best' | 'last'; record: UiMarksReport['last'] };

export type { UiMarksReport };
