// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArmorMapData } from '../../../model/schemas';

import { ArmorMap } from '../ArmorMap';

const DATA: ArmorMapData = { cols: 2, rows: 1, left: 0.25, top: 0.25, width: 0.5, height: 0.5, cells: '17', mode: 'nominal', opacity: 0.6 };

describe(ArmorMap, () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('draws on one canvas', () => {
    const html = render(<ArmorMap data={DATA} />).container;

    expect(html.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('draws no SVG', () => {
    const html = render(<ArmorMap data={DATA} />).container;

    expect(html.querySelectorAll('svg')).toHaveLength(0);
  });

  it('sizes the canvas buffer to the screen', () => {
    const html = render(<ArmorMap data={DATA} />).container;

    expect(html.querySelector('canvas')?.width).toBe(window.innerWidth);
  });
});
