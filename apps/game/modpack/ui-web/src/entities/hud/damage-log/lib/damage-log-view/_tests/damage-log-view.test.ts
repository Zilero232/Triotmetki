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

    expect(ricochets?.hitsText).toBe('×2');
  });

  it('splits the HP bar into what is left and what the own shots took, when the HP left and the max are known', () => {
    const rows = damageLogView(fixture).sections[0]?.rows ?? [];

    expect(rows.map((row) => row.bar)).toEqual([null, { kept: 20, took: 6 }, null, { kept: 15, took: 11 }]);
  });

  it('keeps the HP bar inside its width when the damage is more than the HP lost', () => {
    const row = { ...fixture.dealt[3]!, amount: 5000, hp: 0, max: 900 };

    expect(damageLogView({ ...fixture, dealt: [row] }).sections[0]?.rows[0]?.bar).toEqual({ kept: 0, took: 26 });
  });

  it('draws no HP bar on the hits on the player', () => {
    const rows = damageLogView(fixture).sections[1]?.rows ?? [];

    expect(rows.map((row) => row.bar)).toEqual([null, null]);
  });

  it('tells the shell kind for its colour and keeps a premium shell gold', () => {
    const shells = damageLogView(fixture).sections.flatMap((section) => section.rows.map((row) => row.shell));

    expect(shells).toEqual([
      null,
      { label: 'БП', gold: true, kind: 'apcr' },
      null,
      { label: 'ББ', gold: false, kind: 'ap' },
      { label: 'ОФ', gold: false, kind: 'he' },
      { label: 'КС', gold: false, kind: 'heat' }
    ]);
  });

  it('files an unknown shell code under the other kind', () => {
    const row = { ...fixture.dealt[3]!, shell: { code: 'smoke', label: 'Дым', gold: false } };

    expect(damageLogView({ ...fixture, dealt: [row] }).sections[0]?.rows[0]?.shell?.kind).toBe('other');
  });

  it('counts the crits of a row', () => {
    const rows = damageLogView(fixture).sections[0]?.rows ?? [];

    expect(rows.map((row) => row.critsText)).toEqual(['', '1', '', '']);
  });
});
