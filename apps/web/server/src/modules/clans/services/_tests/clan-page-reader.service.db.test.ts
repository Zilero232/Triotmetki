import { afterAll, beforeAll, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { ClanPageReaderService } from '../clan-page-reader.service';

const OCCURRED_AT = new Date('2026-10-01T12:00:00Z');

const EVENTS = [
  { id: '00000000-0000-4000-8000-000000000003', accountId: 3n },
  { id: '00000000-0000-4000-8000-000000000005', accountId: 5n },
  { id: '00000000-0000-4000-8000-000000000001', accountId: 1n },
  { id: '00000000-0000-4000-8000-000000000004', accountId: 4n },
  { id: '00000000-0000-4000-8000-000000000002', accountId: 2n }
] as const;

describeWithDatabase('ClanPageReaderService.events on a database', () => {
  const prisma = createTestPrisma();
  const service = new ClanPageReaderService(prisma);

  beforeAll(async () => {
    await truncateTables({ prisma, tables: ['clan_member_event', 'player', 'clan'] });
    await prisma.clan.create({ data: { clanId: 1n, tag: 'ALPHA', name: 'Alpha' } });

    for (const event of EVENTS) {
      await prisma.clanMemberEvent.create({ data: { ...event, clanId: 1n, type: 'joined', occurredAt: OCCURRED_AT } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('pages events of one poll in a stable order, so no event repeats or goes missing across pages', async () => {
    const pages = await Promise.all([0, 2, 4].map((offset) => service.events({ clanId: 1n, limit: 2, offset })));

    expect(pages.flatMap((page) => page.items.map((item) => item.accountId))).toEqual([5, 4, 3, 2, 1]);
  });
});
