// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { gunArcSchema } from '../../model/schemas';
import { GunArcWidget } from '../GunArcWidget';

const data = gunArcSchema.parse(readWidgetFixture('gun_arc'));

const markers = (html: HTMLElement) => [...html.querySelectorAll('svg')].map((svg) => svg.parentElement).filter((marker) => marker !== null);

const shownMarkers = (html: HTMLElement) => markers(html).filter((marker) => !marker.className.includes('idle'));

describe(GunArcWidget, () => {
  it('draws a marker on each side of the reticle', () => {
    const html = render(<GunArcWidget data={data} />).container;

    expect(markers(html)).toHaveLength(2);
  });

  it('places the left marker left of the right one', () => {
    const html = render(<GunArcWidget data={data} />).container;
    const [left, right] = markers(html).map((marker) => Number.parseFloat(marker.style.left));

    expect(left).toBeLessThan(right);
  });

  it('adds the centre marker when it has a style', () => {
    const html = render(<GunArcWidget data={{ ...data, centre_marker: 'dot', centre: { x: -32, y: 0 } }} />).container;

    expect(markers(html)).toHaveLength(3);
  });

  it('hides a marker that is off the screen', () => {
    const html = render(<GunArcWidget data={{ ...data, right: null }} />).container;

    expect(shownMarkers(html)).toHaveLength(1);
  });

  it('keeps a marker that went off the screen mounted', () => {
    const html = render(<GunArcWidget data={{ ...data, right: null }} />).container;

    expect(markers(html)).toHaveLength(2);
  });

  it('keeps the last place of a marker that went off the screen', () => {
    const view = render(<GunArcWidget data={data} />);
    const before = markers(view.container)[1]?.style.left;

    view.rerender(<GunArcWidget data={{ ...data, right: null }} />);

    expect(markers(view.container)[1]?.style.left).toBe(before);
  });

  it('keeps the same svg element when every marker goes and comes back', () => {
    const view = render(<GunArcWidget data={data} />);
    const before = view.container.querySelector('svg');
    const empty = { ...data, left: null, right: null, centre: null };

    view.rerender(<GunArcWidget data={empty} />);
    view.rerender(<GunArcWidget data={data} />);

    expect(view.container.querySelector('svg')).toBe(before);
  });
});
