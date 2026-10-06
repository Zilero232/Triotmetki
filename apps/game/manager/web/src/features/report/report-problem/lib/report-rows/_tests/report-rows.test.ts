import preview from '@contract/report-preview.json';
import { describe, expect, it } from 'vitest';

import { reportPreviewSchema } from '@/features/report/report-problem';

import { includedParts, reportRows } from '../report-rows';

const { items } = reportPreviewSchema.parse(preview);
const [first] = items;
const NONE: ReadonlySet<never> = new Set();
const sizeOf = (bytes: number) => `${bytes} B`;

describe('reportRows', () => {
  it('ticks every part that is not excluded', () => {
    expect(reportRows({ items, excluded: NONE, sizeOf }).every((row) => row.checked)).toBe(true);
  });

  it('unticks an excluded part', () => {
    const rows = reportRows({ items, excluded: new Set([first!.part]), sizeOf });

    expect(rows[0]?.checked).toBe(false);
  });

  it('formats the size of each part', () => {
    expect(reportRows({ items, excluded: NONE, sizeOf })[0]?.size).toBe(`${first?.bytes} B`);
  });
});

describe('includedParts', () => {
  it('leaves the excluded parts out', () => {
    expect(includedParts({ items, excluded: new Set([first!.part]) })).toEqual(items.slice(1).map((item) => item.part));
  });
});
