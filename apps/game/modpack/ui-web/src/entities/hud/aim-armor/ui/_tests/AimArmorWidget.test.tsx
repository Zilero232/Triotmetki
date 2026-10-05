// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { aimArmorSchema } from '../../model/schemas';
import { AimArmorWidget } from '../AimArmorWidget';

const data = aimArmorSchema.parse(readWidgetFixture('aim_armor'));

describe(AimArmorWidget, () => {
  it('writes the effective armour, the nominal one and the own shell penetration', () => {
    const html = render(<AimArmorWidget data={data} />).container;

    expect(html.textContent).toBe('246/ 180 ммпроб.218');
  });

  it('leaves the nominal armour and the penetration out when they are switched off', () => {
    const html = render(<AimArmorWidget data={{ ...data, nominal: '', piercing: '' }} />).container;

    expect(html.textContent).toBe('246мм');
  });

  it('writes the ricochet word alone in the bad tone', () => {
    const html = render(<AimArmorWidget data={{ ...data, value: 'рикошет', ricochet: true, tone: 'bad', piercing: '' }} />).container;

    expect(html.textContent).toBe('рикошет');
  });

  it('adds the hit angle after the numbers', () => {
    const html = render(<AimArmorWidget data={{ ...data, angle: '43°' }} />).container;

    expect(html.textContent).toBe('246/ 180 ммпроб.21843°');
  });
});
