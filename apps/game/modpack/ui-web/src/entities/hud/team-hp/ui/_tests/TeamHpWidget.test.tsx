// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import type { TeamHpData } from '../../model/schemas';

import { teamHpSchema } from '../../model/schemas';
import { TeamHpWidget } from '../TeamHpWidget';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const fixture = teamHpSchema.parse(readWidgetFixture('team_hp'));

const mount = (data: TeamHpData): HTMLElement => render(<TeamHpWidget data={data} />).container;

describe(TeamHpWidget, () => {
  it('draws the icon strip from the Python fixture with class icons of both sides', () => {
    const html = mount(fixture);

    expect(sources(html)).toContain('img://gui/maps/icons/vehicleTypes/green/mediumTank.png');
    expect(sources(html)).toContain('img://gui/maps/icons/vehicleTypes/red/at-spg.png');
  });

  it('shows the frag score', () => {
    const html = mount(fixture);

    expect(html.textContent).toContain('2:1');
  });

  it('labels the tier groups of the icon strip', () => {
    const html = mount(fixture);

    expect(html.textContent).toContain('VIII');
  });

  it('draws no class icons when the stock vehicle icons are off', () => {
    const vehicles = { allies: fixture.vehicles.allies.map((vehicle) => ({ ...vehicle, icon: null })), enemies: [] };

    const html = mount({ ...fixture, vehicles });

    expect(html.querySelectorAll('img')).toHaveLength(0);
  });

  it('shows the alive vehicles in the score with the alive toggle', () => {
    const html = mount({ ...fixture, score_alive: true, enemies: { ...fixture.enemies, alive: 0 } });

    expect(html.textContent).toContain('2:0');
  });

  it('shows the numbers and the difference without icons in the bar pair style', () => {
    const html = mount({ ...fixture, style: 'full', vehicles: { allies: [], enemies: [] } });

    expect(html.textContent).toContain('3 200');
    expect(html.textContent).toContain('+2 300');
    expect(html.querySelectorAll('img')).toHaveLength(0);
  });

  it('puts the difference under the score', () => {
    const html = mount({ ...fixture, style: 'full' });

    const diff = [...html.querySelectorAll('span')].find((span) => span.textContent === '+2 300');

    expect(diff?.parentElement?.textContent).toBe('2:1+2 300');
  });

  it('keeps the compact style to the numbers and the score', () => {
    const html = mount({ ...fixture, style: 'compact' });

    expect(html.textContent).toBe('3 2002:1900');
  });

  it('paints the HP in the side tones', () => {
    const html = mount({ ...fixture, style: 'compact' });

    const hp = [...html.querySelectorAll('span')].filter((span) => span.textContent === '3 200' || span.textContent === '900');

    expect(hp.map((span) => span.getAttribute('style'))).toEqual([null, null]);
  });

  it('paints the HP in the colour the player set', () => {
    const html = mount({ ...fixture, style: 'compact', colors: { ally: '#00FF00', enemy: null } });

    const ally = [...html.querySelectorAll('span')].find((span) => span.textContent === '3 200');

    expect(ally?.getAttribute('style')).toContain('color');
  });

  it('leaves the numbers out of the minimal style', () => {
    const html = mount({ ...fixture, style: 'minimal' });

    expect(html.textContent).not.toContain('3 200');
  });
});
