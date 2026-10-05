import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parsePoMessages } from '../../po/po';
import { parsePersonalMissions } from '../personal-missions';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const data = parsePersonalMissions({
  seasonsXml: fixture('seasons.xml'),
  tilesXml: fixture('tiles.xml'),
  listXml: fixture('list.xml'),
  configPy: fixture('personal_missions_config.py'),
  messages: parsePoMessages(fixture('personal_missions_details.po'))
});

describe('parsePersonalMissions', () => {
  it('reads campaigns and operations with their reward vehicles', () => {
    expect(data.campaigns.map(({ campaignId, branch, name }) => ({ campaignId, branch, name }))).toEqual([
      { campaignId: 1, branch: 'regular', name: 'Кампания один' },
      { campaignId: 2, branch: 'pm2', name: null }
    ]);

    expect(data.operations[0]).toMatchObject({
      operationId: 1,
      campaignId: 1,
      name: 'StuG IV',
      nextOperationIds: [2],
      chainsToUnlockNext: 5,
      reward: { nation: 'germany', tag: 'G104_Stug_IV' }
    });

    expect(data.operations[1]).toMatchObject({ operationId: 5, name: null, reward: null });
  });

  it('splits missions into branches by vehicle class or alliance', () => {
    expect(data.branches).toEqual([
      { operationId: 1, chainId: 1, kind: 'vehicleClass', key: 'lightTank', nations: [], minTier: 4, maxTier: 10 },
      { operationId: 5, chainId: 1, kind: 'alliance', key: 'Alliance-USSR', nations: ['ussr', 'china'], minTier: 6, maxTier: 10 }
    ]);
  });

  it('reads missions with localized titles and flags', () => {
    const [first, last] = data.missions;

    expect(first).toMatchObject({ questId: 1, name: 'regular_1_1_1', position: 1, title: 'ЛТ-1. Тест', isInitial: true, hasHonors: true });
    expect(last).toMatchObject({ questId: 15, isFinal: true, requiredUnlocks: [1, 2, 3], title: 'regular_1_1_15' });
  });

  it('renders main and honors conditions from the client config', () => {
    const [topByExp, alive] = data.missions[0].conditions;
    const [assist, series] = data.missions[2].conditions;

    expect(topByExp).toMatchObject({
      progressId: 'topByExp',
      isMain: true,
      icon: 'top',
      template: 'binary',
      description: 'Попасть в топ-10 по опыту.'
    });

    expect(alive).toMatchObject({ progressId: 'alive', isMain: false, description: null });
    expect(assist.description).toBe(`Помочь союзникам нанести ${new Intl.NumberFormat('ru-RU').format(15_000)} урона.`);
    expect(series).toMatchObject({ progressId: 'aliveSeries', display: 'header', icon: 'counter', goal: 5 });
  });

  it('warns instead of failing when the config and localization are missing', () => {
    const bare = parsePersonalMissions({ seasonsXml: fixture('seasons.xml'), tilesXml: fixture('tiles.xml'), listXml: fixture('list.xml') });

    expect(bare.missions[0].conditions).toEqual([]);
    expect(bare.warnings).toHaveLength(2);
  });
});
