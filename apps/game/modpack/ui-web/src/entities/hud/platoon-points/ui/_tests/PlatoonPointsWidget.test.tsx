// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { platoonPointsSchema } from '../../model/schemas';
import { PlatoonPointsWidget } from '../PlatoonPointsWidget';

import s from '../PlatoonPointsWidget.module.scss';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const data = platoonPointsSchema.parse(readWidgetFixture('platoon_points'));

describe(PlatoonPointsWidget, () => {
  it('shows the total of the platoon', () => {
    const html = render(<PlatoonPointsWidget data={data} />).container;

    expect(html.textContent).toContain('34');
  });

  it('shows a row per platoon member with its name and class icon', () => {
    const html = render(<PlatoonPointsWidget data={data} />).container;

    expect(html.textContent).toContain('Союзник');
    expect(sources(html)).toContain('img://gui/maps/icons/vehicleTypes/green/heavyTank.png');
  });

  it('names the block and writes the frags as a caption', () => {
    const html = render(<PlatoonPointsWidget data={data} />).container;

    expect(html.textContent).toContain('Очки взвода');
    expect(html.textContent).toContain('фр. 2');
  });

  it('draws an HP bar under every member name', () => {
    const html = render(<PlatoonPointsWidget data={data} />).container;

    const members = [...html.querySelectorAll(`.${s.member}`)];

    expect(members.map((member) => member.children.length)).toEqual(data.rows.map(() => 2));
  });
});
