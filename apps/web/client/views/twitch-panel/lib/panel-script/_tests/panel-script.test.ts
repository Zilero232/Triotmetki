import type { TwitchPanel } from '@otmetki/schemas';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fromKeys } from 'remeda';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PanelCopy } from '../../panel-html';

import { TWITCH_PANEL } from '../../../config';
import { panelHtml } from '../../panel-html';

const PUBLIC_DIR = path.resolve(import.meta.dirname, '../../../../../public');

const COPY: PanelCopy = { ...fromKeys(TWITCH_PANEL.copyKeys, (key) => key), attribution: 'attribution' };

const PANEL: TwitchPanel = {
  nickname: 'Jove',
  profileUrl: 'https://otmetki.app/p/jove',
  session: { battles: 4, wins: 3, avgDamage: 2500, wn8: 3100, startedAt: '2026-09-27T10:00:00.000Z', isOpen: true },
  marks: { moe3: 12, moe2: 4, moe1: 2, closest: [{ tankName: 'Object 140', marks: 2, percent: 91.5 }] }
};

const mount = (html: string) => {
  const page = new DOMParser().parseFromString(html, 'text/html');
  const panel = page.getElementById('panel');
  const src = [...page.querySelectorAll('script')].at(-1)?.getAttribute('src') ?? '';
  const script = readFileSync(path.join(PUBLIC_DIR, src), 'utf8');

  document.body.replaceChildren(...(panel ? [panel] : []));

  return () => {
    const element = document.createElement('script');

    element.textContent = script;
    document.body.append(element);
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('panel script', () => {
  it('runs the shipped static script and renders the channel panel', async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/?channel=42');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(PANEL)));

    vi.stubGlobal('fetch', fetch);
    mount(panelHtml({ apiUrl: 'https://api.otmetki.app/', locale: 'en', copy: COPY }))();
    await vi.waitFor(() => expect(document.querySelector('.nick')).toHaveTextContent('Jove'));

    expect(fetch).toHaveBeenCalledWith('https://api.otmetki.app/streamers/twitch-panel/42');
    expect(document.querySelector('.block-title')).toHaveTextContent('live');
    expect(document.querySelector('.bar > span')).toHaveStyle({ width: '91.5%' });
    expect(document.querySelector('a.open')).toHaveAttribute('href', PANEL.profileUrl);
  });

  it('formats the mark percent with the panel locale', async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/?channel=42');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(PANEL))));

    mount(panelHtml({ apiUrl: 'https://api.otmetki.app', locale: 'ru', copy: COPY }))();
    await vi.waitFor(() => expect(document.querySelector('.nick')).toHaveTextContent('Jove'));

    expect(document.querySelector('.mark-row strong')?.textContent).toBe('91,50 %');
  });

  it('shows the error state without a channel', () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    mount(panelHtml({ apiUrl: 'https://api.otmetki.app', locale: 'ru', copy: COPY }))();

    expect(document.querySelector('.empty')).toHaveTextContent('error');
    expect(fetch).not.toHaveBeenCalled();
  });
});
