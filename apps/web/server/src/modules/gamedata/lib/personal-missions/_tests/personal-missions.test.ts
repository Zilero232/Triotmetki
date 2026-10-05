import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaClient, Vehicle } from '../../../../../../generated';

import { PERSONAL_MISSION_FILES } from '../../parsers/personal-missions/personal-missions.constants';
import { createMemoryReader } from '../../source/local/local';
import { GAME_PATHS } from '../../source/source.constants';
import { buildPersonalMissions } from '../build/build';
import { writePersonalMissions } from '../writer/writer';

const fixture = (name: string): string => readFileSync(new URL(`../../parsers/personal-missions/_tests/fixtures/${name}`, import.meta.url), 'utf8');

const files = {
  [`${GAME_PATHS.personalMissions}/${PERSONAL_MISSION_FILES.seasons}`]: fixture('seasons.xml'),
  [`${GAME_PATHS.personalMissions}/${PERSONAL_MISSION_FILES.tiles}`]: fixture('tiles.xml'),
  [`${GAME_PATHS.personalMissions}/${PERSONAL_MISSION_FILES.list}`]: fixture('list.xml'),
  [PERSONAL_MISSION_FILES.config]: fixture('personal_missions_config.py')
};

const localeReader = {
  revision: { owner: 'izeberg', repo: 'wot-src', ref: 'RU', sha: 'memory' },
  read: async (path: string) => (path === PERSONAL_MISSION_FILES.localization ? fixture('personal_missions_details.po') : undefined)
};

describe('buildPersonalMissions', () => {
  it('reads the mission files and the localization from their mirrors', async () => {
    const data = await buildPersonalMissions({ reader: createMemoryReader({ sourceId: 'RU', files }), localeReader });

    expect(data?.missions).toHaveLength(3);
    expect(data?.operations[0].name).toBe('StuG IV');
  });

  it('skips a revision without personal missions', async () => {
    expect(await buildPersonalMissions({ reader: createMemoryReader({ sourceId: 'RU', files: {} }) })).toBeUndefined();
  });
});

describe('writePersonalMissions', () => {
  it('replaces the version rows and resolves reward tanks by nation and tag', async () => {
    const prisma = mockDeep<PrismaClient>();
    const data = await buildPersonalMissions({ reader: createMemoryReader({ sourceId: 'RU', files }), localeReader });

    prisma.vehicle.findMany.mockResolvedValue([mock<Vehicle>({ tankId: 13_345, nation: 'germany', tag: 'G104_Stug_IV' })]);

    const counts = await writePersonalMissions({ prisma, gameVersionId: 7, data: data! });

    expect(counts).toEqual({ campaigns: 2, operations: 2, branches: 2, missions: 3 });
    expect(prisma.missionCampaign.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { gameVersionId: 7 } }));

    expect(prisma.missionOperation.createMany.mock.calls[0][0]?.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ gameVersionId: 7, operationId: 1, rewardTankId: 13_345, rewardTankTag: 'G104_Stug_IV' })])
    );
  });
});
