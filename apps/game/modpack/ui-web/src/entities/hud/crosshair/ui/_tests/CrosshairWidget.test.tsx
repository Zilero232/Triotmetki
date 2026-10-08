// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { RETICLE_MARKS } from '../../config';
import { crosshairSchema } from '../../model/schemas';
import { CrosshairWidget } from '../CrosshairWidget';

const data = crosshairSchema.parse(readWidgetFixture('crosshair'));

const mount = (input: typeof data): HTMLElement => render(<CrosshairWidget data={input} />).container;

const marked = { ...data, sketch: false, shape: RETICLE_MARKS.shapeIds[0] };

const reload = data.readouts?.reload;

const withClip = (clip: Partial<NonNullable<NonNullable<typeof reload>['clip']>>): typeof data => {
  if (!data.readouts || !reload?.clip) {
    throw new Error('the fixture draws a drum');
  }

  return { ...data, readouts: { ...data.readouts, reload: { ...reload, clip: { ...reload.clip, ...clip } } } };
};

const shells = (html: HTMLElement): Element[] => Array.from(html.querySelectorAll('[data-shell]'));

describe(CrosshairWidget, () => {
  it('draws the vector mark as paths, not an image', () => {
    const html = mount(data);

    expect(html.querySelector('img')).toBeNull();
    expect(html.querySelectorAll('svg path').length).toBeGreaterThan(0);
  });

  it('writes the next shell seconds and the whole drum reload under them', () => {
    const html = mount(data);

    expect(html.textContent).toContain('1.8');
    expect(html.textContent).toContain('24.6');
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

    expect(crosshairSchema.safeParse({ ...data, readouts: { reload, arcs: null, zoom: null } }).success).toBe(true);
  });

  it('reads a payload of an older crosshair as the game circle', () => {
    const { circle: _circle, ...older } = data;

    expect(crosshairSchema.parse(older).circle).toBe(100);
  });

  it('draws the chosen aim circle smaller in the preview', () => {
    const ring = (circle: number) =>
      mount({ ...data, circle })
        .querySelector('[class*="ring"]')
        ?.getAttribute('style');

    expect(ring(60)).toContain('width: 36%');
  });

  it('draws one shell icon per round, the fired ones dimmed', () => {
    const states = shells(mount(data)).map((shell) => shell.getAttribute('data-shell'));

    expect(states).toStrictEqual(['loaded', 'loaded', 'loaded', 'loaded', 'spent', 'spent']);
  });

  it('draws the shell of the loaded kind', () => {
    const ap = mount(withClip({ shell: 'ap' })).innerHTML;
    const he = mount(withClip({ shell: 'he' })).innerHTML;

    expect(ap).not.toBe(he);
  });

  it('writes a large magazine as a count', () => {
    const html = mount(withClip({ size: 30, loaded: 17 }));

    expect(shells(html)).toHaveLength(0);
    expect(html.textContent).toContain('17');
    expect(html.textContent).toContain('30');
  });

  it('keeps the thin cells as an option', () => {
    const html = mount(withClip({ style: 'bars' }));

    expect(shells(html)).toHaveLength(0);
    expect(html.querySelectorAll('[class*="cell"]')).toHaveLength(6);
  });

  it('fills the next shell of an auto-reloader with its seconds beside it', () => {
    const html = mount(withClip({ refill: { value: '5.0', progress: 0.375 } }));

    expect(shells(html)[4]?.getAttribute('data-shell')).toBe('refill');
    expect(html.textContent).toContain('5.0');
  });

  it('ejects the shell a shot spends', () => {
    const view = render(<CrosshairWidget data={data} />);

    view.rerender(<CrosshairWidget data={withClip({ loaded: 3 })} />);

    expect(view.container.querySelectorAll('[class*="eject"]')).toHaveLength(1);
  });

  it('ejects nothing when the next vehicle has another drum', () => {
    const view = render(<CrosshairWidget data={data} />);

    view.rerender(<CrosshairWidget data={withClip({ size: 4, loaded: 3 })} />);

    expect(view.container.querySelectorAll('[class*="eject"]')).toHaveLength(0);
  });

  it('keeps the mark mounted while it is off in this view', () => {
    const view = render(<CrosshairWidget data={marked} />);
    const before = view.container.querySelectorAll('svg').length;

    view.rerender(<CrosshairWidget data={{ ...marked, shape: null }} />);

    expect(view.container.querySelectorAll('svg')).toHaveLength(before);
  });

  it('hides the mark while it is off in this view', () => {
    const view = render(<CrosshairWidget data={marked} />);

    view.rerender(<CrosshairWidget data={{ ...marked, shape: null }} />);

    expect(view.container.querySelector('[class*="idle"]')).not.toBeNull();
  });

  it('keeps the reticle arcs mounted without readouts', () => {
    const view = render(<CrosshairWidget data={data} />);
    const before = view.container.querySelectorAll('svg').length;

    view.rerender(<CrosshairWidget data={{ ...data, readouts: null }} />);

    expect(view.container.querySelectorAll('svg')).toHaveLength(before);
  });

  it('keeps every shell slot on screen through a shot', () => {
    const view = render(<CrosshairWidget data={data} />);
    const before = shells(view.container);

    view.rerender(<CrosshairWidget data={withClip({ loaded: 3 })} />);

    expect(shells(view.container)).toStrictEqual(before);
  });

  it('draws the shells from the shell sprite, not inline SVG', () => {
    const html = mount(data);
    const icon = shells(html)[0]?.firstElementChild;

    expect(icon?.querySelector('svg')).toBeNull();
    expect(icon?.getAttribute('style')).toContain('shells.png');
  });

  it('writes the sniper zoom right of the reticle', () => {
    expect(mount(data).textContent).toContain('x8.0');
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
