// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { battleClockSchema } from '../../model/schemas';
import { BattleClockWidget } from '../BattleClockWidget';

const data = battleClockSchema.parse(readWidgetFixture('battle_clock'));

describe(BattleClockWidget, () => {
  it('shows only the local time under the stock timer', () => {
    const html = render(<BattleClockWidget data={{ ...data, timer: '' }} />).container;

    expect(html.textContent).toBe('21:47');
  });

  it('puts the battle timer above the clock when it replaces the stock one', () => {
    const html = render(<BattleClockWidget data={data} />).container;

    expect(html.textContent).toBe('07:0021:47');
  });
});
