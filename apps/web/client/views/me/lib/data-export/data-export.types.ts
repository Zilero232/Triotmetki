import type { AnalyticsExport, RawStatsExport } from '@otmetki/schemas';

import type { CsvCell } from '@/shared/lib/data-file';

export type RawExportKind = 'rawJson' | 'tanksCsv';

type AnalyticsExportKind = 'analyticsJson' | 'battlesCsv' | 'sessionsCsv';

export type DataExportKind = AnalyticsExportKind | RawExportKind;

export type ExportFileInput =
  { kind: AnalyticsExportKind; data: AnalyticsExport; date: string } | { kind: RawExportKind; data: RawStatsExport; date: string };

export type JsonFileInput = {
  name: string;
  data: unknown;
};

export type CsvFileInput = {
  name: string;
  rows: readonly Readonly<Record<string, CsvCell>>[];
};
