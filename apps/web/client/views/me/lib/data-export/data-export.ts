import { match } from 'ts-pattern';

import type { DownloadFileInput } from '@/shared/lib/data-file';

import { DATA_FILE, toCsv } from '@/shared/lib/data-file';

import type { CsvFileInput, DataExportKind, ExportFileInput, JsonFileInput, RawExportKind } from './data-export.types';

import { DATA_EXPORTS } from '../../config';

const jsonFile = ({ name, data }: JsonFileInput): DownloadFileInput => ({
  name: `${name}.json`,
  content: JSON.stringify(data, null, 2),
  type: DATA_FILE.jsonType
});

const csvFile = ({ name, rows }: CsvFileInput): DownloadFileInput => ({
  name: `${name}.csv`,
  content: toCsv(rows),
  type: DATA_FILE.csvType
});

export const isRawExport = (kind: DataExportKind): kind is RawExportKind => kind === 'rawJson' || kind === 'tanksCsv';

export const exportFile = (input: ExportFileInput): DownloadFileInput => {
  const base = `${DATA_EXPORTS.filePrefix}-${input.date}`;

  return match(input)
    .with({ kind: 'rawJson' }, ({ data }) => jsonFile({ name: `${base}-stats`, data }))
    .with({ kind: 'tanksCsv' }, ({ data }) => csvFile({ name: `${base}-tanks`, rows: data.tanks }))
    .with({ kind: 'analyticsJson' }, ({ data }) => jsonFile({ name: `${base}-analytics`, data }))
    .with({ kind: 'sessionsCsv' }, ({ data }) => csvFile({ name: `${base}-sessions`, rows: data.sessions }))
    .with({ kind: 'battlesCsv' }, ({ data }) => csvFile({ name: `${base}-battles`, rows: data.battles }))
    .exhaustive();
};
