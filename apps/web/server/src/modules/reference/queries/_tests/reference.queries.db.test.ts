import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { ExpectedValuesService } from '../../services/expected-values.service';
import { ThresholdsService } from '../../services/thresholds.service';
import { VehicleCatalogService } from '../../services/vehicle-catalog.service';
import { EXPECTED_VALUES_QUERIES } from '../expected-values.queries';
import { THRESHOLDS_QUERIES } from '../thresholds.queries';

const capturedAt = new Date('2026-09-01T00:00:00Z');

const threshold = ({
  kind = 'moe',
  tankId,
  date,
  source,
  levels
}: {
  kind?: 'mastery' | 'moe';
  tankId: number;
  date: string;
  source: 'kttc' | 'lesta' | 'manual' | 'otmetki' | 'poliroid';
  levels: [number, number, number, number | null];
}) => ({
  kind,
  tankId,
  date: new Date(date),
  source,
  level1: levels[0],
  level2: levels[1],
  level3: levels[2],
  level4: levels[3],
  sampleSize: 100,
  capturedAt
});

const expected = ({ tankId, date, damage }: { tankId: number; date: string; damage: number }) => ({
  tankId,
  date: new Date(date),
  source: 'xvm',
  expDamage: damage,
  expFrags: 1.1,
  expSpotted: 1.2,
  expDefense: 0.8,
  expWinRate: 52.5
});

const vehicle = (tankId: number) => ({
  tankId,
  name: `Tank ${tankId}`,
  shortName: `T${tankId}`,
  slug: `tank-${tankId}`,
  nation: 'ussr',
  type: 'heavyTank' as const,
  tier: 10
});

describeWithDatabase('reference queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_threshold', 'wn8_expected_value', 'premium_offer', 'vehicle'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps the newest expected values per tank', async () => {
    await prisma.wn8ExpectedValue.createMany({
      data: [
        expected({ tankId: 1, date: '2026-08-01', damage: 1000 }),
        expected({ tankId: 1, date: '2026-09-01', damage: 1100 }),
        expected({ tankId: 2, date: '2026-07-01', damage: 2000 })
      ]
    });

    const table = await new ExpectedValuesService(prisma, EXPECTED_VALUES_QUERIES).all();

    expect([...table.values()]).toEqual([
      { tankId: 1, expDamage: 1100, expSpot: 1.2, expFrag: 1.1, expDef: 0.8, expWinRate: 52.5 },
      { tankId: 2, expDamage: 2000, expSpot: 1.2, expFrag: 1.1, expDef: 0.8, expWinRate: 52.5 }
    ]);
  });

  it('takes the newest threshold per tank and source up to the date, then the preferred source', async () => {
    await prisma.tankThreshold.createMany({
      data: [
        threshold({ tankId: 1, date: '2026-08-01', source: 'otmetki', levels: [1000, 1500, 2000, 2500] }),
        threshold({ tankId: 1, date: '2026-09-01', source: 'otmetki', levels: [1100, 1600, 2100, 2600] }),
        threshold({ tankId: 1, date: '2026-10-01', source: 'otmetki', levels: [1200, 1700, 2200, 2700] }),
        threshold({ tankId: 1, date: '2026-09-15', source: 'poliroid', levels: [900, 1400, 1900, 2400] }),
        threshold({ tankId: 2, date: '2026-09-15', source: 'poliroid', levels: [500, 600, 700, null] }),
        threshold({ kind: 'mastery', tankId: 1, date: '2026-09-01', source: 'lesta', levels: [100, 200, 300, 400] }),
        threshold({ kind: 'mastery', tankId: 2, date: '2026-09-01', source: 'lesta', levels: [100, 200, 300, null] })
      ]
    });

    const set = await new ThresholdsService(prisma, THRESHOLDS_QUERIES).asOf({ date: new Date('2026-09-20T00:00:00Z') });

    expect(set.moe).toEqual(
      new Map([
        [1, { tankId: 1, date: new Date('2026-09-01'), source: 'otmetki', sampleSize: 100, capturedAt, p65: 1100, p85: 1600, p95: 2100, p100: 2600 }],
        [2, { tankId: 2, date: new Date('2026-09-15'), source: 'poliroid', sampleSize: 100, capturedAt, p65: 500, p85: 600, p95: 700, p100: null }]
      ])
    );

    expect(set.mastery).toEqual(
      new Map([
        [
          1,
          {
            tankId: 1,
            date: new Date('2026-09-01'),
            source: 'lesta',
            sampleSize: 100,
            capturedAt,
            class3: 100,
            class2: 200,
            class1: 300,
            master: 400
          }
        ]
      ])
    );
  });

  it('filters thresholds by source when one is given', async () => {
    await prisma.tankThreshold.createMany({
      data: [
        threshold({ tankId: 1, date: '2026-09-01', source: 'otmetki', levels: [1100, 1600, 2100, 2600] }),
        threshold({ tankId: 1, date: '2026-09-15', source: 'poliroid', levels: [900, 1400, 1900, 2400] })
      ]
    });

    const set = await new ThresholdsService(prisma, THRESHOLDS_QUERIES).asOf({ date: null, source: 'poliroid' });

    expect([...set.moe.values()].map((record) => record.source)).toEqual(['poliroid']);
  });

  it('marks the active vehicles that appear in a premium offer', async () => {
    await prisma.vehicle.createMany({ data: [vehicle(1), vehicle(2), { ...vehicle(3), isActive: false }] });

    await prisma.premiumOffer.createMany({
      data: [
        { source: 'shop', title: 'one', tankIds: [1, 3] },
        { source: 'shop', title: 'two', tankIds: [1] }
      ]
    });

    const entries = await new VehicleCatalogService(prisma).all();

    expect([...entries.values()].map((entry) => [entry.summary.tankId, entry.hasOffers])).toEqual([
      [1, true],
      [2, false]
    ]);
  });
});
