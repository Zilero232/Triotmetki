// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { readWidget } from '@/shared/lib/testing/widget-fixture';
import { WIDGET_FIXTURE } from '@/shared/lib/testing/widget-fixture/widget-fixture.constants';

import type { HudSampleProps } from '../HudSample.types';

import { HudSample } from '../HudSample';

const sources = (html: HTMLElement) => [...html.querySelectorAll('img')].map((image) => image.getAttribute('src'));

const KINDS = readdirSync(WIDGET_FIXTURE.dir).map((file) => file.replace('.sample.json', ''));

const CROSSHAIR_MARK = '<img src="img://gui/maps/icons/otmetki/crosshair/dot/dot_32.png" width="32" height="32"/>';

const mount = (props: HudSampleProps): HTMLElement => render(<HudSample {...props} />).container;

describe(HudSample, () => {
  it.each(KINDS)('draws the %s preview widget with the HUD renderer', (kind) => {
    const html = mount({ widget: readWidget(kind) });

    expect(html.firstElementChild?.firstElementChild?.childElementCount).toBeGreaterThan(0);
  });

  it('draws a preview without a widget from its rich text', () => {
    const html = mount({ text: CROSSHAIR_MARK });

    expect(sources(html)).toEqual(['img://gui/maps/icons/otmetki/crosshair/dot/dot_32.png']);
  });

  it('keeps an image preview square at its own size', () => {
    const html = mount({ text: CROSSHAIR_MARK });

    const image = html.querySelector('img');

    expect(image?.style.width).toBe('32rem');
    expect(image?.style.height).toBe('32rem');
  });

  it('draws nothing for a panel without a preview', () => {
    const html = mount({ text: '', widget: null });

    expect(html.childElementCount).toBe(0);
  });
});
