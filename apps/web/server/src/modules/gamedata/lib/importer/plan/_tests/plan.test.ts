import { describe, expect, it } from 'vitest';

import { memoryFiles } from '../../../_tests/fixtures';
import { buildGameData } from '../../../game-data/game-data';
import { createMemoryReader } from '../../../source/local/local';
import { ENTRY_KIND, PROFILE, PROVISION_TYPE } from '../../importer.constants';
import { createImportPlan, importLocalizationKeys } from '../plan';

const data = await buildGameData({ reader: createMemoryReader({ sourceId: 'RU', files: memoryFiles() }), nations: ['ussr'] });
const plan = createImportPlan({ data });
const [vehicle] = data.vehicles;
const KEYS = { nameKey: 'ussr_vehicles:IS', shortNameKey: 'ussr_vehicles:IS_short', descriptionKey: 'ussr_vehicles:IS_descr' } as const;
const keyedData = { ...data, vehicles: [{ ...vehicle, ...KEYS }] };

describe('createImportPlan', () => {
  it('maps vehicles onto database rows without inventing localized names', () => {
    expect(plan.vehicles).toHaveLength(1);
    expect(plan.vehicles[0]).toMatchObject({ tankId: vehicle.tankId, type: 'heavyTank', tier: vehicle.tier, slug: 'r01-is', name: vehicle.name });
    expect(plan.vehicles[0].priceCredit).toBe(vehicle.price?.amount);
    expect(plan.title).toBe(`RU ${data.version}`);
  });

  it('leaves the localized fields empty when there are no messages', () => {
    expect(plan.vehicles[0]).toMatchObject({ localized: {}, description: null, nameKey: vehicle.nameKey });
  });

  it('takes the name, short name and description from the localization messages', () => {
    const messages = { [KEYS.nameKey]: 'ИС', [KEYS.shortNameKey]: 'ИС-1', [KEYS.descriptionKey]: 'Тяжёлый танк' };
    const [row] = createImportPlan({ data: keyedData, messages }).vehicles;

    expect(row).toMatchObject({
      name: 'ИС',
      shortName: 'ИС-1',
      description: 'Тяжёлый танк',
      slug: 'r01-is',
      localized: { name: 'ИС', shortName: 'ИС-1', description: 'Тяжёлый танк' }
    });
  });

  it('uses the localized name as the short name when the short key has no message', () => {
    const [row] = createImportPlan({ data: keyedData, messages: { [KEYS.nameKey]: 'ИС' } }).vehicles;

    expect(row).toMatchObject({ name: 'ИС', shortName: 'ИС', localized: { name: 'ИС', shortName: 'ИС' } });
    expect(row?.localized).not.toHaveProperty('description');
  });

  it('builds stock and top profiles with their module ids', () => {
    expect(plan.profiles.map((profile) => profile.profileId)).toEqual([PROFILE.stock, PROFILE.top]);
    expect(plan.profiles.find((profile) => profile.isDefault)?.profileId).toBe(PROFILE.stock);

    for (const profile of plan.profiles) {
      expect(profile.moduleIds.length).toBeGreaterThan(0);
    }
  });

  it('lists each module once and links the vehicle through module unlocks', () => {
    const ids = plan.modules.map((module) => module.moduleId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(plan.modules.every((module) => module.tankIds.includes(vehicle.tankId))).toBe(true);
    expect(plan.vehicles[0].modulesTree.some((node) => node.unlocks.some((unlock) => unlock.type === 'vehicle'))).toBe(true);
  });

  it('computes compatible vehicles for provisions, including field modifications', () => {
    const modifications = plan.provisions.filter((row) => row.type === PROVISION_TYPE.fieldModification);
    const consumables = plan.provisions.filter((row) => row.type === PROVISION_TYPE.consumable);

    expect(modifications.some((row) => row.tankIds.includes(vehicle.tankId))).toBe(true);
    expect(consumables.some((row) => row.tag === 'artillery_epic')).toBe(false);
    expect(new Set(plan.provisions.map((row) => row.provisionId)).size).toBe(plan.provisions.length);
  });

  it('names provisions from the artefacts localization and keeps the fallback without it', () => {
    const modification = data.postProgression.modifications[0];
    const device = data.optionalDevices.find((item) => item.nameKey !== undefined);
    const messages = { [modification?.nameKey ?? '']: 'Улучшенная ходовая', [device?.nameKey ?? '']: 'Досылатель' };
    const localized = createImportPlan({ data, messages }).provisions;
    const find = (rows: typeof localized, provisionId: number | undefined) => rows.find((row) => row.provisionId === provisionId);

    expect(importLocalizationKeys(data)).toEqual(expect.arrayContaining([modification?.nameKey, device?.nameKey]));
    expect(find(localized, modification?.provisionId)).toMatchObject({ name: 'Улучшенная ходовая', localized: { name: 'Улучшенная ходовая' } });
    expect(find(localized, device?.provisionId)).toMatchObject({ name: 'Досылатель', nameKey: device?.nameKey });
    expect(find(plan.provisions, modification?.provisionId)).toMatchObject({ localized: {} });
  });

  it('names arenas from the arenas localization and keeps the geometry name as the English fallback', () => {
    const [arena] = data.arenas;
    const messages = { [arena?.nameKey ?? '']: 'Карелия', [arena?.descriptionKey ?? '']: 'Скалистые холмы' };
    const [row] = createImportPlan({ data, messages }).arenas;

    expect(importLocalizationKeys(data)).toEqual(expect.arrayContaining([arena?.nameKey, arena?.descriptionKey]));

    expect(row).toMatchObject({
      name: 'Карелия',
      nameEn: arena?.displayName,
      description: 'Скалистые холмы',
      nameKey: arena?.nameKey,
      localized: { name: 'Карелия', description: 'Скалистые холмы' }
    });
  });

  it('falls back to the geometry name for an arena without a message and marks nothing as localized', () => {
    const [arena] = data.arenas;

    expect(plan.arenas[0]).toMatchObject({ name: arena?.displayName, nameEn: arena?.displayName, description: null, localized: {} });
  });

  it('points provision icons at the Lesta GUI assets mirror', () => {
    const pair = data.postProgression.modifications.find((item) => item.imgName !== undefined);
    const device = data.optionalDevices.find((item) => item.icon !== undefined);

    expect(plan.provisions.find((row) => row.provisionId === pair?.provisionId)?.image).toBe(
      `https://raw.githubusercontent.com/unicum-gg/wot.assets/Lesta/gui/maps/icons/vehPostProgression/actionItems/pairModifications/120x120/${pair?.imgName}.png`
    );

    expect(plan.provisions.find((row) => row.provisionId === device?.provisionId)?.image).toBe(
      `https://raw.githubusercontent.com/unicum-gg/wot.assets/Lesta/gui/maps/icons/artefact/${device?.icon}.png`
    );

    expect(plan.provisions.flatMap(({ image }) => (image ? [image] : [])).every((image) => /\/gui\/maps\/icons\/[\w/]+\/\w+\.png$/.test(image))).toBe(
      true
    );
  });

  it('keeps a raw snapshot entry per item and a summary per vehicle', () => {
    const kinds = new Set(plan.entries.map((entry) => entry.kind));

    expect(kinds).toEqual(new Set(Object.values(ENTRY_KIND)));

    expect(plan.summaries.get(vehicle.tankId)?.top?.maxHealth).toBe(
      plan.profiles.find((profile) => profile.profileId === PROFILE.top)?.data.maxHealth
    );
  });
});
