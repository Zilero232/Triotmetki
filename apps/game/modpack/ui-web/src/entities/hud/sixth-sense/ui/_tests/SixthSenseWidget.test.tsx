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
    expect(html.querySelectorAll('circle')).toHaveLength(2);
  });
});
