import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Clan } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { LestaClient } from '../../../../lib/lesta';
import type { StoredStronghold } from '../../selects/clans.selects';

import { STRONGHOLD_FETCH } from '../../config/stronghold.constants';
import { ClanStrongholdReaderService } from '../clan-stronghold-reader.service';

const clanId = 42n;
const [levelKey = ''] = STRONGHOLD_FETCH.levelKeys;

const stored: StoredStronghold = {
  strongholdLevel: 7,
  stronghold: { stats: { building_slots: 3 } },
  strongholdUpdatedAt: new Date('2026-09-01T00:00:00Z')
};

const never: StoredStronghold = { strongholdLevel: null, stronghold: null, strongholdUpdatedAt: null };

const createService = (row: StoredStronghold | null) => {
  const prisma = mockDeep<PrismaService>();
  const lesta = mockDeep<LestaClient>();

  prisma.clan.findUnique.mockResolvedValue(row && mock<Clan>(row));
  prisma.clanSnapshot.findFirst.mockResolvedValue(null);
  prisma.globalMapProvince.findMany.mockResolvedValue([]);

  return { service: new ClanStrongholdReaderService(prisma, lesta), prisma, lesta };
};

describe('ClanStrongholdReaderService', () => {
  it('uses the stored row without calling Lesta', async () => {
    const { service, lesta } = createService(stored);

    const stronghold = await service.stronghold(clanId);

    expect(stronghold.level).toBe(stored.strongholdLevel);
    expect(stronghold.buildingSlots).toBe(3);
    expect(lesta.stronghold.claninfo).not.toHaveBeenCalled();
  });

  it('fetches from Lesta and stores the result when nothing is stored', async () => {
    const { service, prisma, lesta } = createService(never);
    const info = { [levelKey]: 5, building_slots: 2 };

    lesta.stronghold.claninfo.mockResolvedValue({ [String(clanId)]: info });
    prisma.clan.update.mockResolvedValue(mock<Clan>({ ...stored, strongholdLevel: 5, stronghold: { stats: { ...info } } }));

    const stronghold = await service.stronghold(clanId);

    expect(prisma.clan.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clanId }, data: expect.objectContaining({ strongholdLevel: 5, stronghold: { stats: info } }) })
    );

    expect(stronghold).toMatchObject({ level: 5, buildingSlots: 2 });
  });

  it('returns an empty stronghold when Lesta knows no such clan', async () => {
    const { service, prisma, lesta } = createService(null);

    lesta.stronghold.claninfo.mockResolvedValue({});

    const stronghold = await service.stronghold(clanId);

    expect(stronghold).toMatchObject({ clanId: Number(clanId), level: null, buildings: [], battles: 0, updatedAt: null });
    expect(prisma.clan.update).not.toHaveBeenCalled();
  });

  it('returns an empty stronghold instead of throwing when Lesta fails', async () => {
    const { service, prisma, lesta } = createService(null);

    lesta.stronghold.claninfo.mockRejectedValue(new Error('lesta down'));

    await expect(service.stronghold(clanId)).resolves.toMatchObject({ level: null, buildings: [] });
    expect(prisma.clan.update).not.toHaveBeenCalled();
  });
});
