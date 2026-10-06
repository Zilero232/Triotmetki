// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { sixthSenseSchema } from '../../model/schemas';
import { SixthSenseWidget } from '../SixthSenseWidget';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const data = sixthSenseSchema.parse(readWidgetFixture('sixth_sense'));

describe(SixthSenseWidget, () => {
  it('draws our own lamp', () => {
    const html = render(<SixthSenseWidget data={data} />).container;

    expect(sources(html)).toEqual(['img://gui/maps/icons/otmetki/sixth_sense/icons/lamp_64.png']);
  });

  it('counts the lamp time down in seconds inside a ring', () => {
    const html = render(<SixthSenseWidget data={data} />).container;

    expect(html.textContent).toBe('7');
    expect(html.querySelectorAll('path')).toHaveLength(2);
  });

  it('places the ring and the seconds at fixed rem spots of a fixed box, with no text centring Gameface ignores', () => {
    const lamp = render(<SixthSenseWidget data={data} />).container.querySelector<HTMLElement>(':scope > div');
    const [ring, seconds] = [...(lamp?.querySelectorAll<HTMLElement>(':scope > span') ?? [])];

    expect([lamp?.style.width, lamp?.style.height]).toEqual(['84rem', '108rem']);
    expect([ring?.style.left, ring?.style.top]).toEqual(['0rem', '0rem']);
    expect([seconds?.style.left, seconds?.style.top, seconds?.style.width]).toEqual(['22rem', '84rem', '40rem']);
    expect(seconds?.textContent).toBe('7');
  });

  it('keeps the seconds box in place when the count runs out', () => {
    const html = render(<SixthSenseWidget data={{ ...data, elapsed: data.duration }} />).container;
    const lamp = html.querySelector<HTMLElement>(':scope > div');
    const seconds = lamp?.querySelectorAll<HTMLElement>(':scope > span')[1];

    expect([lamp?.style.height, seconds?.style.left, seconds?.textContent]).toEqual(['108rem', '22rem', '']);
  });
});
