// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { gunArcSchema } from '../../model/schemas';
import { GunArcWidget } from '../GunArcWidget';

const data = gunArcSchema.parse(readWidgetFixture('gun_arc'));

const placed = (html: HTMLElement) => [...html.querySelectorAll<HTMLElement>('[style]')].map((element) => element.style.left).filter(Boolean);

describe(GunArcWidget, () => {
  it('writes the degrees left to each limit at the ends of the scale and the gun angle after them', () => {
    const html = render(<GunArcWidget data={data} />).container;

    expect(html.textContent).toBe(`‹ 36°4° ›${data.yaw}`);
  });

  it('leaves the gun angle out when it is switched off', () => {
    const html = render(<GunArcWidget data={{ ...data, yaw: '' }} />).container;

    expect(html.textContent).toBe('‹ 36°4° ›');
  });

  it('places the hull axis tick and the gun dot along the scale', () => {
    const html = render(<GunArcWidget data={data} />).container;

    expect(placed(html)).toEqual(['60rem', '105rem']);
  });

  it('leaves the scale out when it is switched off', () => {
    const html = render(<GunArcWidget data={{ ...data, scale: false }} />).container;

    expect(placed(html)).toEqual([]);
  });
});
