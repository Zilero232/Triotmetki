// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import type { MainGunData } from '../../model/schemas';

import { battleProgressSchema } from '../../model/schemas';
import { BattleProgressWidget } from '../BattleProgressWidget';

import blockStyles from '../components/MainGunBlock/MainGunBlock.module.scss';
import lineStyles from '../components/Wn8Line/Wn8Line.module.scss';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const data = battleProgressSchema.parse(readWidgetFixture('battle_progress'));

const withMedal = (patch: Partial<MainGunData>) => ({ ...data, main_gun: data.main_gun && { ...data.main_gun, ...patch } });

const reached = withMedal({ status: 'reached', damage: 3100, left: 0, progress: 1 });

describe(BattleProgressWidget, () => {
  it('draws the stock medal large', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(sources(html)).toContain('img://gui/maps/icons/achievement/mainGun.png');
  });

  it('names the medal above the damage left', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(html.querySelector(`.${blockStyles.title}`)?.textContent).toBe('Основной калибр');
  });

  it('shows the damage still needed with its caption', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(html.querySelector(`.${blockStyles.figure}`)?.textContent).toBe('1 090до медали');
  });

  it('draws a gold progress bar while the medal is in progress', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(html.querySelector(`.${blockStyles.fill}`)?.classList).toContain(blockStyles.gold);
  });

  it('scales the bar to the progress', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(html.querySelector<HTMLElement>(`.${blockStyles.fill}`)?.style.transform).toBe('scaleX(0.629)');
  });

  it('ticks a reached medal', () => {
    const html = render(<BattleProgressWidget data={reached} />).container;

    expect(sources(html)).toContain('img://gui/maps/icons/library/done.png');
  });

  it('says earned for a reached medal', () => {
    const html = render(<BattleProgressWidget data={reached} />).container;

    expect(html.querySelector(`.${blockStyles.figure}`)?.textContent).toBe('получено');
  });

  it('leaves the tick out while the medal is in progress', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(sources(html)).not.toContain('img://gui/maps/icons/library/done.png');
  });

  it('turns the bar green for a reached medal', () => {
    const html = render(<BattleProgressWidget data={reached} />).container;

    expect(html.querySelector(`.${blockStyles.fill}`)?.classList).toContain(blockStyles.good);
  });

  it('drops the bar once the reached medal settles', () => {
    const html = render(<BattleProgressWidget data={withMedal({ status: 'reached', left: 0, progress: null })} />).container;

    expect(html.querySelector(`.${blockStyles.track}`)).toBeNull();
  });

  it('paints the WN8 estimate in its rating colour', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(html.querySelector<HTMLElement>(`.${lineStyles.value}`)?.style.color).toBe('rgb(160, 108, 240)');
  });

  it('separates the WN8 line from the medal', () => {
    const html = render(<BattleProgressWidget data={data} />).container;

    expect(html.querySelector(`.${lineStyles.line}`)?.classList).toContain(lineStyles.divided);
  });

  it('draws the WN8 line alone without the medal', () => {
    const html = render(<BattleProgressWidget data={{ ...data, main_gun: null }} />).container;

    expect(html.querySelector(`.${lineStyles.line}`)?.classList).not.toContain(lineStyles.divided);
  });
});
