// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { clockStripSchema } from '../../model/schemas';
import { ClockStripWidget } from '../ClockStripWidget';

const data = clockStripSchema.parse(readWidgetFixture('clock_strip'));

describe(ClockStripWidget, () => {
  it('lines up the time, the date, the server, the ping and the online count', () => {
    const html = render(<ClockStripWidget data={data} />).container;

    expect(html.textContent).toBe('18:0527.09RU442 мсонлайн81 234');
  });

  it('leaves out what the player switched off', () => {
    const html = render(<ClockStripWidget data={{ ...data, date: '', server: '', ping: '', online: '' }} />).container;

    expect(html.textContent).toBe('18:05');
  });
});
