import { describe, expect, it } from 'vitest';

import { parseViewerMarks, parseViewerState } from '..';

const STATE = {
  labels: { title: 'Просмотр попаданий' },
  battles: [{ id: '42', map: 'Химмельсдорф', vehicle: 'ИС-7', date: '03.10 21:40' }],
  battle: { id: '42', map: 'Химмельсдорф', vehicle: 'ИС-7', date: '03.10 21:40' },
  tabs: [{ id: 'received', label: 'По мне', count: 1 }],
  tab: 'received',
  rows: [
    {
      n: 1,
      index: 0,
      vehicle: 'Maus',
      class: 'heavy',
      result: 'Пробитие',
      part: 'Корпус',
      tone: 'pen',
      shell: 'ББ 128',
      damage: '490',
      angle: '34°',
      armor: '242',
      nominal: '200'
    }
  ],
  selected: 0,
  loading: false,
  approx: false
};

describe('parseViewerState', () => {
  it('reads the state the hit viewer pushes', () => {
    const state = parseViewerState(JSON.stringify(STATE));

    expect(state?.rows[0]?.shell).toBe('ББ 128');
  });

  it('refuses a row with an unknown result', () => {
    const broken = { ...STATE, rows: [{ ...STATE.rows[0], tone: 'boom' }] };

    expect(parseViewerState(JSON.stringify(broken))).toBeNull();
  });

  it('refuses text that is not JSON', () => {
    expect(parseViewerState('{')).toBeNull();
  });
});

describe('parseViewerMarks', () => {
  it('reads the projected markers', () => {
    const marks = parseViewerMarks(JSON.stringify({ selected: 2, marks: [{ i: 2, tone: 'ricochet', x: 0.5, y: 0.4, tx: 0.45, ty: 0.38 }] }));

    expect(marks?.marks[0]?.tone).toBe('ricochet');
  });

  it('answers null without a property yet', () => {
    expect(parseViewerMarks(null)).toBeNull();
  });
});
