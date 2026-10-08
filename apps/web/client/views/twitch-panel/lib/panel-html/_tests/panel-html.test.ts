import { fromKeys } from 'remeda';
import { describe, expect, it } from 'vitest';

import type { PanelCopy } from '../panel-html.types';

import { TWITCH_PANEL } from '../../../config';
import { panelHtml } from '../panel-html';

const COPY: PanelCopy = { ...fromKeys(TWITCH_PANEL.copyKeys, (key) => key), attribution: 'attribution' };

describe('panelHtml', () => {
  it('loads the Twitch helper and embeds the api url without a trailing slash', () => {
    const html = panelHtml({ apiUrl: 'https://api.otmetki.app/', locale: 'en', copy: COPY });

    expect(html).toContain(TWITCH_PANEL.helperScript);
    expect(html).toContain(`<script src="${TWITCH_PANEL.panelScript}"></script>`);
    expect(html).toContain('&quot;apiUrl&quot;:&quot;https://api.otmetki.app&quot;');
    expect(html.startsWith('<!doctype html><html lang="en">')).toBe(true);
  });

  it('cannot be broken out of by the embedded copy', () => {
    const html = panelHtml({ apiUrl: 'https://api.otmetki.app', locale: 'ru', copy: { ...COPY, error: '</script><script>alert(1)</script>' } });

    expect(html).not.toContain('</script><script>alert(1)');
  });
});
