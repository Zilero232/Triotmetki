import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { damageLogSchema } from '../../../model/schemas';
import { damageLogView } from '../damage-log-view';

const fixture = damageLogSchema.parse(readWidgetFixture('damage_log'));

describe(damageLogView, () => {
  it('keeps the dealt section above the received one', () => {
    const view = damageLogView(fixture);

    expect(view.sections.map((section) => section.key)).toEqual(['dealt', 'received']);
  });

  it('leaves an empty section out', () => {
    const view = damageLogView({ ...fixture, received: [] });

    expect(view.sections.map((section) => section.key)).toEqual(['dealt']);
  });

  it('writes a received amount with its minus', () => {
    const received = damageLogView(fixture).sections[1]?.rows[0];

    expect(received?.amountText).toBe('-310');
  });

  it('mutes a row without damage and leaves its amount blank', () => {
    const ricochets = damageLogView(fixture).sections[0]?.rows.find((row) => row.hitsText !== '');

    expect(ricochets?.muted).toBe(true);
    expect(ricochets?.amountText).toBe('');
  });

  it('counts the grouped hits on a target', () => {
    const ricochets = damageLogView(fixture).sections[0]?.rows.find((row) => row.hitsText !== '');

    expect(ricochets?.hitsText).toBe('x2');
  });

  it('draws the HP bar only when the HP left and the max are known', () => {
    const rows = damageLogView(fixture).sections[0]?.rows ?? [];

    expect(rows.map((row) => row.bar)).toEqual([null, { value: 1180, max: 1500 }, null, { value: 510, max: 900 }]);
  });
});
