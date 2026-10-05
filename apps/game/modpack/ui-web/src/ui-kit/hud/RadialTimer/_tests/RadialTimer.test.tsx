// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HUD_TONE_COLORS } from '@/shared/config';

import { RadialTimer } from '../RadialTimer';

const ring = (progress: number) => render(<RadialTimer progress={progress} size={84} stroke={3} />).container;

describe(RadialTimer, () => {
  it("sizes its box and the ring's box in rem, so the ring cannot spill past the panel frame", () => {
    const html = ring(0.7);
    const box = html.querySelector<HTMLElement>(':scope > div');
    const layer = html.querySelector<HTMLElement>('span');

    expect([box?.style.width, box?.style.height, layer?.style.width, layer?.style.height]).toEqual(['84rem', '84rem', '84rem', '84rem']);
  });

  it("draws the countdown on the track's own circle, with no SVG transform Gameface would place elsewhere", () => {
    const html = ring(0.7);
    const track = html.querySelector('circle');
    const arc = html.querySelector('path');

    expect(track?.getAttribute('r')).toBe('39');
    expect(arc?.getAttribute('d')).toMatch(/^M42 3A39 39 0 1 1 /);
    expect(html.querySelector('[transform]')).toBeNull();
  });

  it('paints the arc with a hex colour, never currentColor', () => {
    expect(ring(0.5).querySelector('path')?.getAttribute('stroke')).toBe(HUD_TONE_COLORS.accent.hex);
  });

  it('leaves only the track once the time is out', () => {
    expect(ring(0).querySelector('path')).toBeNull();
  });
});
