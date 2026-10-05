// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { pageSample } from '@/entities/replay/replay/_tests/fixtures';

import { REPLAYS_RU } from '../../config';
import { ReplaysBrowser } from '../ReplaysBrowser';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const PAGE = pageSample();

const mountBrowser = () => render(<ReplaysBrowser enabled page={PAGE} onTurnOn={vi.fn()} />).container;

const buttonWhere = (root: HTMLElement, matches: (text: string) => boolean): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find((button) => matches(button.textContent?.trim() ?? ''));

  if (!found) {
    throw new Error('no such button');
  }

  return found;
};

const buttonNamed = (root: HTMLElement, text: string): HTMLButtonElement => buttonWhere(root, (label) => label === text);

const click = (button: HTMLButtonElement): void => {
  void act(() => button.click());
};

const selectTigerReplay = (html: HTMLElement): void => {
  click(buttonWhere(html, (label) => label.includes('Tiger I')));
};

describe(ReplaysBrowser, () => {
  it('draws the map images from the client', () => {
    const html = mountBrowser();

    expect(sources(html)).toEqual(
      expect.arrayContaining(['img://gui/maps/icons/map/small/05_prohorovka.png', 'img://gui/maps/icons/map/stats/05_prohorovka.png'])
    );
  });

  it('draws a row for every replay', () => {
    const html = mountBrowser();

    expect(html.textContent).toContain('Т-34');
    expect(html.textContent).toContain('Tiger I');
  });

  it('shows the chosen replay with its outcome and offers to watch it', () => {
    const html = mountBrowser();

    expect(html.textContent).toContain(REPLAYS_RU.outcome_win);
    expect(buttonNamed(html, REPLAYS_RU.watch).disabled).toBe(false);
  });

  it('names the client version of a replay from another client', () => {
    const html = mountBrowser();

    selectTigerReplay(html);

    expect(html.textContent).toContain('1.44.1.0');
  });

  it('shows a replay from another client without an outcome', () => {
    const html = mountBrowser();

    selectTigerReplay(html);

    expect(html.textContent).toContain(REPLAYS_RU.noResults);
  });

  it('does not offer to watch a replay from another client', () => {
    const html = mountBrowser();

    selectTigerReplay(html);

    expect(buttonNamed(html, REPLAYS_RU.watch).disabled).toBe(true);
  });

  it('narrows the list to the nation picked in the filter bar', () => {
    const html = mountBrowser();

    click(buttonWhere(html, (label) => label.startsWith(REPLAYS_RU.filterNation)));

    click(buttonNamed(html, `${REPLAYS_RU.nation_germany}1`));

    expect(html.textContent).toContain('Tiger I');
    expect(html.textContent).not.toContain('Т-34');
  });

  it('offers to turn the component on when it is off', () => {
    const onTurnOn = vi.fn();
    const html = render(<ReplaysBrowser enabled={false} page={null} onTurnOn={onTurnOn} />).container;

    click(buttonNamed(html, REPLAYS_RU.turnOn));

    expect(onTurnOn).toHaveBeenCalledOnce();
  });
});
