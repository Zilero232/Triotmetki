// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { marksReportSchema } from '@/shared/api/protocol';
import marksReportSample from '@/shared/api/protocol/_tests/fixtures/marks-report.sample.json?raw';

import { MarksReport } from '../MarksReport';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const REPORT = marksReportSchema.parse(JSON.parse(marksReportSample));

const renderReport = () => render(<MarksReport report={REPORT} />).container;

describe(MarksReport, () => {
  it('draws the tank header icons: nation, tier, class and the current mark', () => {
    expect(sources(renderReport())).toEqual([
      'img://gui/maps/icons/flags/25x17/germany.png',
      'img://gui/maps/icons/levels/tank_level_small_7.png',
      'img://gui/maps/icons/vehicleTypes/white/heavyTank.png',
      'img://gui/maps/icons/library/marksOnGun/mark_2.png'
    ]);
  });

  it('names the tank', () => {
    expect(renderReport().textContent).toContain('Tiger I');
  });

  it('shows the current percent', () => {
    expect(renderReport().textContent).toContain('85,20 %');
  });

  it('shows the damage of the battles in the cards and the table', () => {
    expect(renderReport().textContent).toContain('4 500');
  });

  it('draws the chart with plain elements, no SVG', () => {
    expect(renderReport().querySelectorAll('svg')).toHaveLength(0);
  });

  it('writes plain minus signs and spaces, never the typographic ones', () => {
    expect(renderReport().textContent).not.toMatch(/[−\u202F]/);
  });
});
