// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HUD_TONE_COLORS } from '@/shared/config';

import { RadialTimer } from '../RadialTimer';

const ring = (progress: number) => render(<RadialTimer inner={56} progress={progress} size={84} stroke={3} />).container;

describe(RadialTimer, () => {
  it("sizes its box and the ring's box in rem, so the ring cannot spill past the panel frame", () => {
    const html = ring(0.7);
    const box = html.querySelector<HTMLElement>(':scope > div');
    const layer = html.querySelector<HTMLElement>('span');

    expect([box?.style.width, box?.style.height, layer?.style.width, layer?.style.height]).toEqual(['84rem', '84rem', '84rem', '84rem']);
  });

  it("draws the countdown on the track's own circle, with no SVG transform Gameface would place elsewhere", () => {
    const [track, arc] = [...ring(0.7).querySelectorAll('path')];

    expect(track?.getAttribute('d')).toBe('M42 3A39 39 0 1 1 42 81A39 39 0 1 1 42 3');
    expect(arc?.getAttribute('d')).toMatch(/^M42 3A39 39 0 1 1 /);
    expect(ring(0.7).querySelector('[transform]')).toBeNull();
  });

  it('paints the arc with a hex colour, never currentColor', () => {
    expect(ring(0.5).querySelectorAll('path')[1]?.getAttribute('stroke')).toBe(HUD_TONE_COLORS.accent.hex);
  });

  it('puts the content in its own square at the centre of the ring, without relying on flex centring', () => {
    const html = render(
      <RadialTimer inner={56} progress={0.5} size={84} stroke={3}>
        <i />
      </RadialTimer>
    ).container;

    const content = html.querySelector('i')?.parentElement;

    expect([content?.style.top, content?.style.left, content?.style.width, content?.style.height]).toEqual(['14rem', '14rem', '56rem', '56rem']);
  });

  it('fills its rem box with the svg the way the reticle arcs that draw in the client do: attributes, no inline style', () => {
    const svg = ring(0.5).querySelector('svg');

    expect([svg?.getAttribute('width'), svg?.getAttribute('height'), svg?.getAttribute('style')]).toEqual(['100%', '100%', null]);
  });

  it('draws the track as a path, the one SVG shape the reticle arcs prove in the client', () => {
    expect(ring(0.5).querySelector('circle')).toBeNull();
  });

  it('leaves only the track once the time is out', () => {
    expect(ring(0).querySelectorAll('path')).toHaveLength(1);
  });
});
