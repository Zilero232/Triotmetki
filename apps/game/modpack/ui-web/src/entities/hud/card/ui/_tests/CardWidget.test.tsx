// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { cardSchema } from '../../model/schemas';
import { CardWidget } from '../CardWidget';

const data = cardSchema.parse(readWidgetFixture('card'));

const STRIP_MARK = 'span[style*="background-color"]';

describe(CardWidget, () => {
  it('draws the header, the chips, the rows and the footer of the Python card', () => {
    const html = render(<CardWidget data={data} />).container;

    expect(html.textContent).toContain('ЛБЗ');
    expect(html.textContent).toContain('EBR 105');
    expect(html.textContent).toContain('79.53%');
    expect(html.textContent).toContain('в работе');
    expect(html.textContent).toContain('Союз-4. Прорыв линии обороны');
    expect(html.textContent).toContain('Нанести 4000 урона');
    expect(html.textContent).toContain('ср. урон 2 781');
  });

  it('paints a rating in its colour', () => {
    const html = render(<CardWidget data={data} />).container;

    const rating = [...html.querySelectorAll('span')].find((span) => span.textContent === 'WN8 2 310');

    expect(rating?.getAttribute('style')).toContain('color');
  });

  it('fills a progress bar by the row progress', () => {
    const html = render(<CardWidget data={data} />).container;

    expect(html.innerHTML).toContain('width: 72%');
  });

  it('draws the status marks as glyphs', () => {
    const html = render(<CardWidget data={data} />).container;

    expect(html.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('gives every glyph an explicit colour, never currentColor', () => {
    const html = render(<CardWidget data={data} />).container;

    expect(html.innerHTML).not.toContain('currentColor');
  });

  it('draws one coloured mark per strip tone, in order', () => {
    const html = render(<CardWidget data={data} />).container;

    const marks = [...html.querySelectorAll(STRIP_MARK)].map((span) => span.getAttribute('style'));

    expect(marks).toHaveLength(4);
    expect(marks[0]).toContain('rgb(76, 195, 107)');
    expect(marks[1]).toContain('rgb(235, 114, 118)');
  });

  it('draws no strip for a card without marks', () => {
    const html = render(<CardWidget data={{ ...data, strip: [] }} />).container;

    expect(html.querySelectorAll(STRIP_MARK)).toHaveLength(0);
  });

  it('keeps a card without a title to its body', () => {
    const html = render(<CardWidget data={{ ...data, title: null, value: null, chips: [] }} />).container;

    expect(html.textContent).not.toContain('ЛБЗ');
    expect(html.textContent).toContain('Союз-4');
  });
});
