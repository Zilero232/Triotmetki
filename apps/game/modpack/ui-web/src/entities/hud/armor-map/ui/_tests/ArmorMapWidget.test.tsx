// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { armorMapSchema } from '../../model/schemas';
import { ArmorMapWidget } from '../ArmorMapWidget';

const data = armorMapSchema.parse(readWidgetFixture('armor_map'));

describe(ArmorMapWidget, () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('draws on one canvas', () => {
    const html = render(<ArmorMapWidget data={data} />).container;

    expect(html.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('draws no SVG', () => {
    const html = render(<ArmorMapWidget data={data} />).container;

    expect(html.querySelectorAll('svg')).toHaveLength(0);
  });

  it('sizes the canvas buffer to the screen', () => {
    const html = render(<ArmorMapWidget data={data} />).container;

    expect(html.querySelector('canvas')?.width).toBe(window.innerWidth);
  });
});
