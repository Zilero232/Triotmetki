import type { CatalogCounts, PlanWriteInput } from '../../importer.types';

import { Prisma } from '../../../../../../../generated';
import { ASSET_URL_PREFIX } from '../../../source/github/github';
import { inBatches, toStoredJson } from '../batches/batches';

export const writeCatalog = async ({ prisma, plan }: Omit<PlanWriteInput, 'gameVersionId'>): Promise<CatalogCounts> => {
  const withImages = new Set(
    (await prisma.vehicle.findMany({ where: { NOT: { images: { equals: Prisma.AnyNull } } }, select: { tankId: true } })).map(({ tankId }) => tankId)
  );

  const vehicles = await inBatches({
    items: plan.vehicles,
    run: (batch) =>
      prisma.$transaction(
        batch.map((row) => {
          const game = {
            nation: row.nation,
            type: row.type,
            tier: row.tier,
            tag: row.tag,
            isPremium: row.isPremium,
            isCollectible: row.isCollectible,
            isWheeled: row.isWheeled,
            priceCredit: row.priceCredit ?? null,
            priceGold: row.priceGold ?? null,
            specs: toStoredJson(row.specs),
            crew: toStoredJson(row.crew),
            modulesTree: toStoredJson(row.modulesTree),
            nextTanks: toStoredJson(row.nextTanks),
            prevTankIds: row.prevTankIds,
            nameKey: row.nameKey,
            descriptionKey: row.descriptionKey
          };

          const update = { ...game, ...row.localized };

          return prisma.vehicle.upsert({
            where: { tankId: row.tankId },
            create: {
              tankId: row.tankId,
              name: row.name,
              shortName: row.shortName,
              description: row.description,
              slug: row.slug,
              images: row.images,
              ...game
            },
            update: withImages.has(row.tankId) ? update : { ...update, images: row.images }
          });
        })
      )
  });

  const profiles = await inBatches({
    items: plan.profiles,
    run: (batch) =>
      prisma.$transaction(
        batch.map((row) =>
          prisma.vehicleProfile.upsert({
            where: { tankId_profileId: { tankId: row.tankId, profileId: row.profileId } },
            create: {
              tankId: row.tankId,
              profileId: row.profileId,
              isDefault: row.isDefault,
              moduleIds: row.moduleIds,
              data: toStoredJson(row.data)
            },
            update: { isDefault: row.isDefault, moduleIds: row.moduleIds, data: toStoredJson(row.data) }
          })
        )
      )
  });

  const modules = await inBatches({
    items: plan.modules,
    run: (batch) =>
      prisma.$transaction(
        batch.map((row) => {
          const fields = {
            name: row.name,
            type: row.type,
            nation: row.nation,
            tier: row.tier,
            priceCredit: row.priceCredit ?? null,
            weight: row.weight ?? null,
            tankIds: row.tankIds,
            data: toStoredJson(row.data)
          };

          return prisma.module.upsert({ where: { moduleId: row.moduleId }, create: { moduleId: row.moduleId, ...fields }, update: fields });
        })
      )
  });

  const provisionsWithImages = new Set(
    (
      await prisma.provision.findMany({
        where: { image: { startsWith: 'http' }, NOT: { image: { startsWith: ASSET_URL_PREFIX } } },
        select: { provisionId: true }
      })
    ).map(({ provisionId }) => provisionId)
  );

  const provisions = await inBatches({
    items: plan.provisions,
    run: (batch) =>
      prisma.$transaction(
        batch.map((row) => {
          const fields = {
            tag: row.tag,
            type: row.type,
            nameKey: row.nameKey ?? null,
            descriptionKey: row.descriptionKey ?? null,
            priceCredit: row.priceCredit ?? null,
            priceGold: row.priceGold ?? null,
            tankIds: row.tankIds,
            data: toStoredJson(row.data)
          };

          const update = { ...fields, ...row.localized };

          return prisma.provision.upsert({
            where: { provisionId: row.provisionId },
            create: { provisionId: row.provisionId, name: row.name, description: row.description, image: row.image, ...fields },
            update: provisionsWithImages.has(row.provisionId) || !row.image ? update : { ...update, image: row.image }
          });
        })
      )
  });

  await prisma.provision.updateMany({ where: { image: { not: null }, NOT: { image: { startsWith: 'http' } } }, data: { image: null } });

  const crewRoles = await inBatches({
    items: plan.crewRoles,
    run: (batch) =>
      prisma.$transaction(batch.map((row) => prisma.crewRole.upsert({ where: { role: row.role }, create: row, update: { skills: row.skills } })))
  });

  const crewSkills = await inBatches({
    items: plan.crewSkills,
    run: (batch) =>
      prisma.$transaction(
        batch.map((row) => {
          const fields = { type: row.type ?? null, roles: row.roles, isCommon: row.isCommon, data: toStoredJson(row.data) };

          return prisma.crewSkill.upsert({ where: { skill: row.skill }, create: { skill: row.skill, name: row.name, ...fields }, update: fields });
        })
      )
  });

  const arenasWithEnglish = new Set(
    (await prisma.arena.findMany({ where: { nameEn: { not: null } }, select: { arenaId: true } })).map(({ arenaId }) => arenaId)
  );

  const arenas = await inBatches({
    items: plan.arenas,
    run: (batch) =>
      prisma.$transaction(
        batch.map((row) => {
          const fields = {
            nameKey: row.nameKey,
            descriptionKey: row.descriptionKey,
            camouflageType: row.camouflageType ?? null,
            sizeMeters: row.sizeMeters,
            modes: row.modes,
            image: row.image,
            data: toStoredJson(row.data)
          };

          const update = { ...fields, ...row.localized };

          return prisma.arena.upsert({
            where: { arenaId: row.arenaId },
            create: { arenaId: row.arenaId, name: row.name, nameEn: row.nameEn, description: row.description, slug: row.slug, ...fields },
            update: arenasWithEnglish.has(row.arenaId) ? update : { ...update, nameEn: row.nameEn }
          });
        })
      )
  });

  return { vehicles, profiles, modules, provisions, crewRoles, crewSkills, arenas };
};
