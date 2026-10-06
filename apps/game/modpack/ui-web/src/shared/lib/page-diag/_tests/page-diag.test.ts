import { afterEach, describe, expect, it } from 'vitest';

import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';

import { forgetReports, PAGE_DIAG, reportOnce } from '..';

const install = () => {
  const mock = createGamefaceMock({ state: '', clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });

  installGamefaceMock(mock);

  return mock;
};

const sentDiags = (mock: ReturnType<typeof install>) => mock.sent().map((raw): { type: string; text: string } => JSON.parse(raw));

afterEach(() => {
  forgetReports();
});

describe(reportOnce, () => {
  it('sends a diag line with its kind to the game log', () => {
    const mock = install();

    reportOnce({ kind: 'wheel', text: 'deltaY 100' });

    expect(sentDiags(mock)).toEqual([{ type: 'diag', text: 'wheel: deltaY 100' }]);
  });

  it('reports the first line of a kind as sent', () => {
    install();

    const reported = reportOnce({ kind: 'wheel', text: 'deltaY 100' });

    expect(reported).toBe(true);
  });

  it('skips a second line of the same kind', () => {
    const mock = install();

    reportOnce({ kind: 'wheel', text: 'deltaY 100' });

    const reported = reportOnce({ kind: 'wheel', text: 'deltaY -100' });

    expect(reported).toBe(false);
    expect(sentDiags(mock)).toHaveLength(1);
  });

  it('sends a line of another kind', () => {
    const mock = install();

    reportOnce({ kind: 'wheel', text: 'deltaY 100' });

    reportOnce({ kind: 'mouse', text: 'x' });

    expect(sentDiags(mock)).toHaveLength(2);
  });

  it('cuts a long line to the diag limit', () => {
    const mock = install();

    reportOnce({ kind: 'mouse', text: 'x'.repeat(PAGE_DIAG.maxChars * 2) });

    expect(sentDiags(mock)[0]?.text).toHaveLength(PAGE_DIAG.maxChars);
  });
});
