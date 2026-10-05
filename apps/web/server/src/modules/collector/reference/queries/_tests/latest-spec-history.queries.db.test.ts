import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { latestSpecHistory } from '../latest-spec-history.queries';

const vehicle = (tankId: number) => ({
  tankId,
  name: `Tank ${tankId}`,
  shortName: `T${tankId}`,
  slug: `tank-${tankId}`,
  nation: 'ussr',
  type: 'mediumTank' as const,
  tier: 5
});

describeWithDatabase('latestSpecHistory', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['vehicle_spec_history', 'vehicle', 'game_version'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const seed = async () => {
    await prisma.vehicle.createMany({ data: [vehicle(1), vehicle(2), vehicle(3)] });

    const [older, previous, current] = await Promise.all(
      ['1.0', '1.1', '1.2'].map((version) => prisma.gameVersion.create({ data: { version }, select: { id: true } }))
    );

    if (!older || !previous || !current) {
      throw new Error('game versions not seeded');
    }

    await prisma.vehicleSpecHistory.createMany({
      data: [
        { tankId: 1, gameVersionId: older.id, specs: { version: 'older' }, capturedAt: new Date('2026-08-01T00:00:00Z') },
        { tankId: 1, gameVersionId: previous.id, specs: { version: 'previous' }, capturedAt: new Date('2026-09-01T00:00:00Z') },
        { tankId: 1, gameVersionId: current.id, specs: { version: 'current' }, capturedAt: new Date('2026-10-01T00:00:00Z') },
        { tankId: 2, gameVersionId: previous.id, specs: { version: 'previous' }, capturedAt: new Date('2026-07-01T00:00:00Z') },
        { tankId: 2, gameVersionId: older.id, specs: { version: 'older-but-later' }, capturedAt: new Date('2026-09-15T00:00:00Z') },
        { tankId: 3, gameVersionId: current.id, specs: { version: 'current' }, capturedAt: new Date('2026-10-01T00:00:00Z') }
      ]
    });

    return { currentId: current.id };
  };

  it('takes the latest captured spec per tank outside the given game version', async () => {
    const { currentId } = await seed();

    expect(await latestSpecHistory({ db: prisma.$kysely, gameVersionId: currentId })).toEqual([
      { tankId: 1, specs: { version: 'previous' } },
      { tankId: 2, specs: { version: 'older-but-later' } }
    ]);
  });
});
