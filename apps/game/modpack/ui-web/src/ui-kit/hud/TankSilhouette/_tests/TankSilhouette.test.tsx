// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TankSilhouette } from '../TankSilhouette';

const drawn = () => render(<TankSilhouette color='#e8b84a' fill={62} shape='heavy' tick={65} width={248} />).container;

describe(TankSilhouette, () => {
  it('sizes every layer of the tank in rem, never as a share of a box laid out again on a drag', () => {
    const svgs = Array.from(drawn().querySelectorAll('svg'));

    expect(svgs).toHaveLength(3);

    svgs.forEach((svg) => {
      expect(svg.getAttribute('width')).toBeNull();
      expect(svg.getAttribute('height')).toBeNull();
      expect(svg.style.width).toBe('248rem');
      expect(svg.style.height).toMatch(/^\d+rem$/);
    });
  });

  it('fills the body to the percent and marks the next mark', () => {
    const html = drawn();

    expect(html.querySelector('[class*="fill"]')?.getAttribute('style')).toContain('width');
    expect(html.querySelector('[class*="tick"]')).not.toBeNull();
  });
});
