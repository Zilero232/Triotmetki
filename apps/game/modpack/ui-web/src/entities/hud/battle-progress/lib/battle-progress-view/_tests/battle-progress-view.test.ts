import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import type { MainGunData } from '../../../model/schemas';

import { battleProgressSchema } from '../../../model/schemas';
import { battleProgressView } from '../battle-progress-view';

const data = battleProgressSchema.parse(readWidgetFixture('battle_progress'));

const withMedal = (patch: Partial<MainGunData>) => ({ ...data, main_gun: data.main_gun && { ...data.main_gun, ...patch } });

const reached = withMedal({ status: 'reached', damage: 3100, left: 0, progress: 1 });

const settled = withMedal({ status: 'reached', damage: 3100, left: 0, progress: null });

describe(battleProgressView, () => {
  it('heads the medal with the damage still needed', () => {
    const view = battleProgressView(data);

    expect(view.mainGun?.headline).toBe('1 090');
  });

  it('captions the damage still needed', () => {
    const view = battleProgressView(data);

    expect(view.mainGun?.caption).toBe('до медали');
  });

  it('paints a medal in progress gold', () => {
    const view = battleProgressView(data);

    expect(view.mainGun?.tone).toBe('gold');
  });

  it('writes the damage dealt against the threshold', () => {
    const view = battleProgressView(data);

    expect(view.mainGun?.tally).toBe('1 850 / 2 940');
  });

  it('fills the bar with the progress', () => {
    const view = battleProgressView(data);

    expect(view.mainGun?.fill).toBe(0.629);
  });

  it('says earned for a reached medal', () => {
    const view = battleProgressView(reached);

    expect(view.mainGun?.headline).toBe('получено');
  });

  it('paints a reached medal green', () => {
    const view = battleProgressView(reached);

    expect(view.mainGun?.tone).toBe('good');
  });

  it('drops the caption of a reached medal', () => {
    const view = battleProgressView(reached);

    expect(view.mainGun?.caption).toBeNull();
  });

  it('drops the tally once the bar is gone', () => {
    const view = battleProgressView(settled);

    expect(view.mainGun?.tally).toBeNull();
  });

  it('has no medal block without the medal', () => {
    const view = battleProgressView({ ...data, main_gun: null });

    expect(view.mainGun).toBeNull();
  });

  it('passes the WN8 line through', () => {
    const view = battleProgressView(data);

    expect(view.wn8).toEqual(data.wn8);
  });
});
