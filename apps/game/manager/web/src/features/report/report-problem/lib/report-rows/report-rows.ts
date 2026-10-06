import type { ReportPart } from '../../api';
import type { IncludedPartsInput, ReportRow, ReportRowsInput } from './report-rows.types';

export const reportRows = ({ items, excluded, sizeOf }: ReportRowsInput): ReportRow[] =>
  items.map((item) => ({
    part: item.part,
    name: item.name,
    size: sizeOf(item.bytes),
    truncated: item.truncated,
    redactions: item.redactions,
    text: item.text,
    checked: !excluded.has(item.part)
  }));

export const includedParts = ({ items, excluded }: IncludedPartsInput): ReportPart[] =>
  items.filter((item) => !excluded.has(item.part)).map((item) => item.part);
