// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRowFigure } from '../use-row-figure';

const FIGURE = {
  shapes: [{ x: 0.2, y: 0.1, w: 0.6, h: 0.82 }],
  marks: [
    { x: 0.5, y: 0.12, tone: 'pen' as const },
    { x: 0.5, y: 0.12, tone: 'ricochet' as const }
  ]
};

describe(useRowFigure, () => {
  it('places the shapes in percent with stable keys', () => {
    const hook = renderHook(() => useRowFigure(FIGURE));

    expect(hook.result.current.shapes).toEqual([{ key: 'shape-0', style: { left: '20%', top: '10%', width: '60%', height: '82%' } }]);
  });

  it('keeps the tone of every mark under a stable key', () => {
    const hook = renderHook(() => useRowFigure(FIGURE));

    const marks = hook.result.current.marks.map(({ key, tone }) => ({ key, tone }));

    expect(marks).toEqual([
      { key: 'mark-0', tone: 'pen' },
      { key: 'mark-1', tone: 'ricochet' }
    ]);
  });

  it('places the marks in percent', () => {
    const hook = renderHook(() => useRowFigure(FIGURE));

    expect(hook.result.current.marks[0]?.style).toEqual({ left: '50%', top: '12%' });
  });
});
