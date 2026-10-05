import { Inject, Injectable } from '@nestjs/common';

import type { LestaClients } from '../../../../core';
import type { EnglishNamesResult } from '../reference.types';

import { slugify, toJsonValue } from '../../../../common/lib';
import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { REFERENCE } from '../config/reference.constants';
import { achievementSchema, arenaSchema, crewSkillSchema, keyedEntries } from '../lib/encyclopedia';

@Injectable()
export class CatalogSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients
  ) {}

  async arenas(): Promise<number> {
    const arenas = keyedEntries(await this.clients.bulk.encyclopedia.arenas()).flatMap(([arenaId, value]) => {
      const parsed = arenaSchema.safeParse(value);

      return parsed.success ? [{ arenaId, ...parsed.data }] : [];
    });

    for (const arena of arenas) {
      const data = {
        name: arena.name_i18n ?? arena.name ?? arena.arenaId,
        camouflageType: arena.camouflage_type ?? null,
        description: arena.description ?? null,
        image: arena.image ?? null,
        data: toJsonValue(arena)
      };

      await this.prisma.arena.upsert({
        where: { arenaId: arena.arenaId },
        create: { arenaId: arena.arenaId, slug: slugify(arena.arenaId) || arena.arenaId, ...data },
        update: data
      });
    }

    return arenas.length;
  }

  async achievements(): Promise<number> {
    const achievements = keyedEntries(await this.clients.bulk.encyclopedia.achievements()).flatMap(([, value]) => {
      const parsed = achievementSchema.safeParse(value);

      return parsed.success ? [parsed.data] : [];
    });

    for (const achievement of achievements) {
      const data = {
        section: achievement.section ?? null,
        type: achievement.type ?? null,
        title: achievement.name_i18n ?? achievement.name,
        description: achievement.description ?? null,
        condition: achievement.condition ?? null,
        image: achievement.image_big ?? achievement.image ?? null,
        options: toJsonValue(achievement.options),
        order: achievement.order ?? null
      };

      await this.prisma.achievement.upsert({ where: { name: achievement.name }, create: { name: achievement.name, ...data }, update: data });
    }

    return achievements.length;
  }

  async englishNames(): Promise<EnglishNamesResult> {
    const language = REFERENCE.englishLanguage;

    const [arenas, achievements, skills] = await Promise.all([
      this.clients.bulk.encyclopedia.arenas({ language }),
      this.clients.bulk.encyclopedia.achievements({ language }),
      this.clients.bulk.encyclopedia.crewskills({ language })
    ]);

    const arenaUpdates = keyedEntries(arenas).flatMap(([arenaId, value]) => {
      const parsed = arenaSchema.safeParse(value);
      const name = parsed.success ? (parsed.data.name_i18n ?? parsed.data.name) : null;

      return parsed.success && name
        ? [this.prisma.arena.updateMany({ where: { arenaId }, data: { nameEn: name, descriptionEn: parsed.data.description ?? null } })]
        : [];
    });

    const achievementUpdates = keyedEntries(achievements).flatMap(([, value]) => {
      const parsed = achievementSchema.safeParse(value);
      const title = parsed.success ? parsed.data.name_i18n : null;

      return parsed.success && title
        ? [
            this.prisma.achievement.updateMany({
              where: { name: parsed.data.name },
              data: { titleEn: title, descriptionEn: parsed.data.description ?? null }
            })
          ]
        : [];
    });

    const skillUpdates = keyedEntries(skills).flatMap(([skill, value]) => {
      const parsed = crewSkillSchema.safeParse({ skill, ...(typeof value === 'object' ? value : {}) });

      return parsed.success
        ? [this.prisma.crewSkill.updateMany({ where: { skill }, data: { nameEn: parsed.data.name, descriptionEn: parsed.data.description ?? null } })]
        : [];
    });

    await this.prisma.$transaction([...arenaUpdates, ...achievementUpdates, ...skillUpdates]);

    return { arenas: arenaUpdates.length, achievements: achievementUpdates.length, crewSkills: skillUpdates.length };
  }
}
