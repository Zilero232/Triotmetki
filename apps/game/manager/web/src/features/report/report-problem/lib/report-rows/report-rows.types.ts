import type { ReportItem, ReportPart } from '../../api';

export type ReportRowsInput = {
  items: readonly ReportItem[];
  excluded: ReadonlySet<ReportPart>;
  sizeOf: (bytes: number) => string;
};

export type IncludedPartsInput = Omit<ReportRowsInput, 'sizeOf'>;

export type ReportRow = {
  part: ReportPart;
  name: string;
  size: string;
  truncated: boolean;
  redactions: number;
  text: string;
  checked: boolean;
};
