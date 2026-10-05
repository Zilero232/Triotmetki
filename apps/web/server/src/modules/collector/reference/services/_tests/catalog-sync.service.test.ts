import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { LestaClients, PrismaService } from '../../../../../core';

import { REFERENCE } from '../../config/reference.constants';
import { CatalogSyncService } from '../catalog-sync.service';

const createSync = () => {
  const prisma = mockDeep<PrismaService>();
  const clients = mockDeep<LestaClients>();

  return { prisma, clients, service: new CatalogSyncService(prisma, clients) };
};

describe('CatalogSyncService.arenas', () => {
  it('writes nothing and deletes nothing for an empty response', async () => {
    const { prisma, clients, service } = createSync();

    clients.bulk.encyclopedia.arenas.mockResolvedValue({});

    expect(await service.arenas()).toBe(0);
    expect(prisma.arena.upsert).not.toHaveBeenCalled();
    expect(prisma.arena.deleteMany).not.toHaveBeenCalled();
  });

  it('prefers the localised name, then the raw name, then the arena id', async () => {
    const { prisma, clients, service } = createSync();

    clients.bulk.encyclopedia.arenas.mockResolvedValue({
      '01_karelia': { name_i18n: 'Карелия', name: 'Karelia' },
      '02_malinovka': { name: 'Malinovka' },
      '03_campania': {}
    });

    expect(await service.arenas()).toBe(3);
    expect(prisma.arena.upsert.mock.calls.map(([args]) => args.update.name)).toEqual(['Карелия', 'Malinovka', '03_campania']);
  });

  it('gives a new arena a slug and never rewrites the slug of a known one', async () => {
    const { prisma, clients, service } = createSync();

    clients.bulk.encyclopedia.arenas.mockResolvedValue({ '01_karelia': { name: 'Karelia' } });

    await service.arenas();

    const [upsert] = prisma.arena.upsert.mock.calls[0] ?? [];

    expect(upsert?.create.slug).toBeTruthy();
    expect(upsert?.update).not.toHaveProperty('slug');
  });

  it('skips an arena that does not match the schema', async () => {
    const { clients, service } = createSync();

    clients.bulk.encyclopedia.arenas.mockResolvedValue({ bad: 'not-an-object', good: { name: 'Good' } });

    expect(await service.arenas()).toBe(1);
  });
});

describe('CatalogSyncService.achievements', () => {
  it('uses the big image when present and falls back to the regular one', async () => {
    const { prisma, clients, service } = createSync();

    clients.bulk.encyclopedia.achievements.mockResolvedValue({
      a: { name: 'medalA', image_big: 'big.png', image: 'small.png' },
      b: { name: 'medalB', image: 'small.png' },
      c: { name: 'medalC' }
    });

    expect(await service.achievements()).toBe(3);
    expect(prisma.achievement.upsert.mock.calls.map(([args]) => args.update.image)).toEqual(['big.png', 'small.png', null]);
  });

  it('skips an achievement without a name', async () => {
    const { prisma, clients, service } = createSync();

    clients.bulk.encyclopedia.achievements.mockResolvedValue({ a: { name_i18n: 'Nameless' } });

    expect(await service.achievements()).toBe(0);
    expect(prisma.achievement.upsert).not.toHaveBeenCalled();
  });

  it('titles an achievement by its localised name, falling back to the key name', async () => {
    const { prisma, clients, service } = createSync();

    clients.bulk.encyclopedia.achievements.mockResolvedValue({ a: { name: 'medalA', name_i18n: 'Медаль' }, b: { name: 'medalB' } });

    await service.achievements();

    expect(prisma.achievement.upsert.mock.calls.map(([args]) => args.update.title)).toEqual(['Медаль', 'medalB']);
  });
});

describe('CatalogSyncService.englishNames', () => {
  it('asks Lesta for English and fills only the English columns of known rows', async () => {
    const { prisma, clients, service } = createSync();

    prisma.$transaction.mockResolvedValue([]);
    clients.bulk.encyclopedia.arenas.mockResolvedValue({ '01_karelia': { name_i18n: 'Karelia', description: 'Rocky hills' } });
    clients.bulk.encyclopedia.achievements.mockResolvedValue({ medalKay: { name: 'medalKay', name_i18n: "Kay's Medal" } });
    clients.bulk.encyclopedia.crewskills.mockResolvedValue({ camouflage: { name: 'Camouflage', description: null } });

    expect(await service.englishNames()).toEqual({ arenas: 1, achievements: 1, crewSkills: 1 });

    expect(clients.bulk.encyclopedia.arenas).toHaveBeenCalledWith({ language: REFERENCE.englishLanguage });

    expect(prisma.arena.updateMany).toHaveBeenCalledWith({
      where: { arenaId: '01_karelia' },
      data: { nameEn: 'Karelia', descriptionEn: 'Rocky hills' }
    });

    expect(prisma.achievement.updateMany).toHaveBeenCalledWith({
      where: { name: 'medalKay' },
      data: { titleEn: "Kay's Medal", descriptionEn: null }
    });

    expect(prisma.crewSkill.updateMany).toHaveBeenCalledWith({ where: { skill: 'camouflage' }, data: { nameEn: 'Camouflage', descriptionEn: null } });
    expect(prisma.arena.upsert).not.toHaveBeenCalled();
    expect(prisma.achievement.upsert).not.toHaveBeenCalled();
  });

  it('skips an achievement Lesta sent without a localised title', async () => {
    const { prisma, clients, service } = createSync();

    prisma.$transaction.mockResolvedValue([]);
    clients.bulk.encyclopedia.arenas.mockResolvedValue({});
    clients.bulk.encyclopedia.achievements.mockResolvedValue({ medalKay: { name: 'medalKay' } });
    clients.bulk.encyclopedia.crewskills.mockResolvedValue({});

    expect((await service.englishNames()).achievements).toBe(0);
    expect(prisma.achievement.updateMany).not.toHaveBeenCalled();
  });
});
