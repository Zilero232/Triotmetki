// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { crosshairSchema } from '../../model/schemas';
import { CrosshairWidget } from '../CrosshairWidget';

const data = crosshairSchema.parse(readWidgetFixture('crosshair'));

const mount = (input: typeof data): HTMLElement => render(<CrosshairWidget data={input} />).container;

describe(CrosshairWidget, () => {
  it('draws the vector mark as paths, not an image', () => {
    const html = mount(data);

    expect(html.querySelector('img')).toBeNull();
    expect(html.querySelectorAll('svg path').length).toBeGreaterThan(0);
  });

  it('writes the own reload seconds and the full reload under them', () => {
    const html = mount(data);

    expect(html.textContent?.replaceAll(' ', ' ')).toContain('3.2');
    expect(html.textContent).toContain('7.6');
  });

  it('turns the box to the index colour in the last second', () => {
    const readouts = data.readouts && { ...data.readouts, reload: data.readouts.reload && { ...data.readouts.reload, state: 'final' as const } };
    const html = mount({ ...data, readouts });

    expect(html.querySelector('[class*="final"]')).not.toBeNull();
  });

  it('keeps the box on screen with the full reload time while the gun is loaded', () => {
    const readouts = data.readouts && { ...data.readouts, reload: { value: '7.6', full: null, state: 'loaded' as const, clip: null } };
    const html = mount({ ...data, readouts });

    expect(html.textContent).toContain('7.6');
    expect(html.querySelector('[class*="loaded"]')).not.toBeNull();
  });

  it('reads the loaded state from the game', () => {
    const reload = { value: '7.6', full: null, state: 'loaded', clip: null };

    expect(crosshairSchema.safeParse({ ...data, readouts: { reload, arcs: null } }).success).toBe(true);
  });

  it('draws nothing beside the mark without readouts', () => {
    const html = mount({ ...data, readouts: null });

    expect(html.textContent).toBe('');
  });

  it('draws a full-colour mark as its client image', () => {
    const html = mount({ ...data, shape: null, mark: 'img://gui/maps/icons/otmetki/crosshair/otmetki/triad_64.png' });

    expect(html.querySelector('img')?.getAttribute('src')).toBe('img://gui/maps/icons/otmetki/crosshair/otmetki/triad_64.png');
  });
});
