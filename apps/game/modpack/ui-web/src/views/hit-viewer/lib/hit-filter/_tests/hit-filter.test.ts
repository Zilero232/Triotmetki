import { describe, expect, it } from 'vitest';

import type { ViewerRow } from '../../viewer-protocol';

import { filterRows, toneCounts } from '..';

const row = (index: number, tone: ViewerRow['tone']): ViewerRow => ({
  n: index + 1,
  index,
  vehicle: 'Maus',
  class: 'heavy',
  result: tone,
  part: 'Корпус',
  zone: 'ВЛД',
  tone,
  shell: 'ББ 128',
  damage: '—',
  angle: '—',
  armor: '—',
  nominal: '—'
});

const ROWS = [row(0, 'pen'), row(1, 'ricochet'), row(2, 'pen'), row(3, 'blocked')];

describe(toneCounts, () => {
  it('counts each result present, in the protocol order', () => {
    expect(toneCounts(ROWS)).toStrictEqual([
      { tone: 'pen', count: 2, label: 'pen' },
      { tone: 'blocked', count: 1, label: 'blocked' },
      { tone: 'ricochet', count: 1, label: 'ricochet' }
    ]);
  });
});

describe(filterRows, () => {
  it('keeps only the rows of the picked result', () => {
    expect(filterRows({ rows: ROWS, tone: 'pen' }).map(({ index }) => index)).toStrictEqual([0, 2]);
  });

  it('keeps every row without a pick', () => {
    expect(filterRows({ rows: ROWS, tone: null })).toHaveLength(4);
  });
});
