import { describe, expect, it } from 'vitest';

import { drumView, shellMotion } from '../drum-view';

const clip = { style: 'shells', size: 4, loaded: 3, shell: 'ap', gold: false, refill: null } as const;

describe(drumView, () => {
  it('draws a short magazine one full-size shell per round, loaded first', () => {
    expect(drumView(clip)).toStrictEqual({
      mode: 'row',
      density: 'full',
      cells: [
        { index: 0, state: 'loaded' },
        { index: 1, state: 'loaded' },
        { index: 2, state: 'loaded' },
        { index: 3, state: 'spent' }
      ]
    });
  });

  it('packs a ten-round drum into narrower shells', () => {
    const view = drumView({ ...clip, size: 10, loaded: 10 });

    expect(view.mode).toBe('row');
    expect(view.density).toBe('dense');
    expect(view.cells).toHaveLength(10);
  });

  it('writes a larger magazine as a count', () => {
    expect(drumView({ ...clip, size: 30, loaded: 17 })).toStrictEqual({ mode: 'count', density: 'full', cells: [] });
  });

  it('keeps the thin cells up to twelve rounds', () => {
    expect(drumView({ ...clip, style: 'bars', size: 12, loaded: 2 }).mode).toBe('row');
    expect(drumView({ ...clip, style: 'bars', size: 13, loaded: 2 }).mode).toBe('count');
  });

  it('marks the next shell an auto-reloader is filling', () => {
    const view = drumView({ ...clip, loaded: 2, refill: { value: '5.0', progress: 0.375 } });

    expect(view.cells.map((cell) => cell.state)).toStrictEqual(['loaded', 'loaded', 'refill', 'spent']);
  });
});

describe(shellMotion, () => {
  it('does not move anything on the first draw', () => {
    expect(shellMotion({ index: 3, loaded: 3, previous: undefined })).toBeNull();
  });

  it('ejects the shell a shot just spent', () => {
    expect(shellMotion({ index: 2, loaded: 2, previous: 3 })).toBe('eject');
    expect(shellMotion({ index: 1, loaded: 2, previous: 3 })).toBeNull();
  });

  it('loads every shell a refill brought back', () => {
    expect([0, 1, 2, 3].map((index) => shellMotion({ index, loaded: 4, previous: 1 }))).toStrictEqual([null, 'load', 'load', 'load']);
  });
});
