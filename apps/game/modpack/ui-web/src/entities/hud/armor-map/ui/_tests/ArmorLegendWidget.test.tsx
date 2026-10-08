// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { armorLegendSchema } from '../../model/schemas';
import { ArmorLegendWidget } from '../ArmorLegendWidget';

const data = armorLegendSchema.parse(readWidgetFixture('armor_legend'));

const textOf = (html: HTMLElement): string => html.textContent;

describe(ArmorLegendWidget, () => {
  it('names the tank on the screen', () => {
    const html = render(<ArmorLegendWidget data={data} />).container;

    expect(textOf(html)).toContain(data.tank);
  });

  it('shows every mode with its key', () => {
    const html = render(<ArmorLegendWidget data={data} />).container;
    const missing = data.modes.filter((mode) => !textOf(html).includes(mode.key + mode.label));

    expect(missing).toEqual([]);
  });

  it('lists the attacker shells in the shell mode', () => {
    const html = render(<ArmorLegendWidget data={data} />).container;
    const missing = data.shells.filter((shell) => !textOf(html).includes(shell.label));

    expect(missing).toEqual([]);
  });

  it('draws a swatch per scale stop', () => {
    const html = render(<ArmorLegendWidget data={data} />).container;

    expect(html.querySelectorAll('[style*="background-color"]').length).toBeGreaterThanOrEqual(data.scale.length);
  });

  it('shows the hover card verdict', () => {
    const html = render(<ArmorLegendWidget data={data} />).container;

    expect(textOf(html)).toContain(data.readout?.verdict);
  });

  it('leaves the hover card out without a ray under the cursor', () => {
    const html = render(<ArmorLegendWidget data={{ ...data, readout: null }} />).container;

    expect(textOf(html)).not.toContain(data.readout?.verdict);
  });
});
