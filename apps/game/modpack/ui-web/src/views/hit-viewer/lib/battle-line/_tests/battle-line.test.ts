import { describe, expect, it } from 'vitest';

import { hitCounts, resultLabel, vehicleLine } from '..';

const BATTLE = { id: '1', map: 'Прохоровка', vehicle: 'ИСУ-152', date: '06.10 14:43' };
const LABELS = { win: 'Победа', loss: 'Поражение', draw: 'Ничья' };

describe('vehicleLine', () => {
  it('puts the roman tier before the tank', () => {
    expect(vehicleLine({ ...BATTLE, tier: 8 })).toBe('VIII ИСУ-152');
  });

  it('shows the tank alone when the tier is unknown', () => {
    expect(vehicleLine({ ...BATTLE, tier: null })).toBe('ИСУ-152');
  });
});

describe('resultLabel', () => {
  it('names the battle result', () => {
    expect(resultLabel({ battle: { ...BATTLE, result: 'loss' }, labels: LABELS })).toBe(LABELS.loss);
  });

  it('says nothing before the results arrive', () => {
    expect(resultLabel({ battle: BATTLE, labels: LABELS })).toBeNull();
  });
});

describe('hitCounts', () => {
  it('counts nothing for a battle stored before the counts', () => {
    expect(hitCounts(BATTLE)).toEqual({ received: 0, dealt: 0 });
  });
});
