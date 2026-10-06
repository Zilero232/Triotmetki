// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { deltaView, percentText } from '../../lib/tank-card-view';
import { tankCardSchema } from '../../model/schemas';
import { TankCardWidget } from '../TankCardWidget';

const extended = tankCardSchema.parse(readWidgetFixture('tank_card'));

const compact = { ...extended, sections: [], hint: 'Alt — подробнее' };

const withoutMarks = { ...extended, percent: null, delta: null, points: [], thresholds: [], goal: null, note: null, marks: 0 };

const text = (html: Element): string => html.textContent ?? '';

describe(TankCardWidget, () => {
  it('heads the card with the tier and the tank', () => {
    const html = render(<TankCardWidget data={extended} />).container;

    expect(text(html)).toContain(`VII${extended.vehicle ?? ''}`);
  });

  it('shows the percent with its last change', () => {
    const html = render(<TankCardWidget data={extended} />).container;

    expect(text(html)).toContain(`${percentText(extended.percent)}${deltaView(extended.delta)?.text ?? ''}`);
  });

  it('labels every mark level of the bar with its average', () => {
    const html = render(<TankCardWidget data={extended} />).container;

    expect(html.querySelectorAll('[class*="average"]')).toHaveLength(extended.thresholds.length);
  });

  it('puts the cursor at the percent', () => {
    const html = render(<TankCardWidget data={extended} />).container;

    expect(html.querySelector('[class*="cursor"]')).not.toBeNull();
  });

  it('draws one titled section per group of the grid', () => {
    const html = render(<TankCardWidget data={extended} />).container;

    expect(html.querySelectorAll('[class*="section"]')).toHaveLength(extended.sections.length);
  });

  it('keeps the compact card to the header, the bar and the hint', () => {
    const html = render(<TankCardWidget data={compact} />).container;

    expect(html.querySelectorAll('[class*="section"]')).toHaveLength(0);
    expect(text(html)).toContain(compact.hint);
  });

  it('draws no bar for a tank without marks', () => {
    const html = render(<TankCardWidget data={withoutMarks} />).container;

    expect(html.querySelector('[class*="scale"]')).toBeNull();
  });
});
