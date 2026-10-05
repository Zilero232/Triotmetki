import { describe, expect, it } from 'vitest';

import { marksReportSchema } from '@/shared/api/protocol';
import marksReportSample from '@/shared/api/protocol/_tests/fixtures/marks-report.sample.json?raw';

import { marksReportView } from '../marks-report';

const REPORT = marksReportSchema.parse(JSON.parse(marksReportSample));

describe(marksReportView, () => {
  it('shows the current percent in the header and as the progress width', () => {
    const view = marksReportView(REPORT);

    expect(view.percent).toBe('85,20 %');
    expect(view.progress).toBe('85.2%');
  });

  it('lays out the last, the best and one trend card per window', () => {
    const view = marksReportView(REPORT);

    expect(view.cards.map((card) => card.key)).toEqual(['last', 'best', 'trend-10', 'trend-25']);
  });

  it('shows the best battle damage and its gain as a good card', () => {
    const view = marksReportView(REPORT);

    expect(view.cards[1]).toMatchObject({ value: '4 500', delta: '+1,80 %', tone: 'good' });
  });

  it('marks a battle that lost percent as bad in the table', () => {
    const view = marksReportView(REPORT);

    expect(view.rows[1]).toMatchObject({ damage: '2 300', delta: '-0,15 %', tone: 'bad' });
  });

  it('shows a dash for the oldest battle with nothing to compare', () => {
    const view = marksReportView(REPORT);

    expect(view.rows.at(-1)?.delta).toBe('—');
  });

  it('draws one chart bar per percent with the lowest one as the floor', () => {
    const view = marksReportView(REPORT);

    expect(view.chart?.bars).toHaveLength(7);
    expect(view.chart?.min).toBe('80,12 %');
  });

  it('skips the chart for a single point', () => {
    expect(marksReportView({ ...REPORT, chart: [80] }).chart).toBeNull();
  });
});
