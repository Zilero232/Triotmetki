import { Inject, Injectable } from '@nestjs/common';
import { isNonNullish } from 'remeda';

import type { LestaClients } from '../../../../core';

import { toJsonValue } from '../../../../common/lib';
import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { keyedEntries, toModuleType, toProvisionType } from '../lib/encyclopedia/encyclopedia';
import { crewRoleSchema, crewSkillSchema, moduleSchema, provisionSchema } from '../lib/encyclopedia/encyclopedia.schemas';

@Injectable()
export class EquipmentSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients
  ) {}

  async modules(): Promise<number> {
    const rows = keyedEntries(await this.clients.bulk.encyclopedia.modules()).flatMap(([, value]) => {
      const parsed = moduleSchema.safeParse(value);
      const type = parsed.success ? toModuleType(parsed.data.type) : null;

      return parsed.success && type ? [{ ...parsed.data, type }] : [];
    });

    for (const row of rows) {
      const data = {
        name: row.name,
        type: row.type,
        nation: row.nation,
        tier: row.tier,
        priceCredit: row.price_credit ?? null,
        weight: row.weight ?? null,
        image: row.image ?? null,
        tankIds: row.tanks ?? [],
        data: toJsonValue(row)
      };

      await this.prisma.module.upsert({ where: { moduleId: row.module_id }, create: { moduleId: row.module_id, ...data }, update: data });
    }

    return rows.length;
  }

  async provisions(): Promise<number> {
    const rows = keyedEntries(await this.clients.bulk.encyclopedia.provisions()).flatMap(([, value]) => {
      const parsed = provisionSchema.safeParse(value);
      const type = parsed.success ? toProvisionType(parsed.data.type) : null;

      return parsed.success && type ? [{ ...parsed.data, type }] : [];
    });

    for (const row of rows) {
      const data = {
        name: row.name,
        tag: row.tag ?? null,
        type: row.type,
        description: row.description ?? null,
        image: row.image ?? null,
        priceCredit: row.price_credit ?? null,
        priceGold: row.price_gold ?? null,
        weight: row.weight ?? null,
        tankIds: row.tanks ?? [],
        data: toJsonValue(row)
      };

      await this.prisma.provision.upsert({
        where: { provisionId: row.provision_id },
        create: { provisionId: row.provision_id, ...data },
        update: data
      });
    }

    return rows.length;
  }

  async crew(): Promise<number> {
    const skills = keyedEntries(await this.clients.bulk.encyclopedia.crewskills()).flatMap(([key, value]) => {
      const parsed = crewSkillSchema.safeParse({ skill: key, ...(typeof value === 'object' ? value : {}) });

      return parsed.success ? [parsed.data] : [];
    });

    for (const skill of skills) {
      const data = {
        name: skill.name,
        type: skill.type ?? null,
        roles: skill.roles ?? [],
        isCommon: skill.is_common ?? false,
        description: skill.description ?? null,
        image: Object.values(skill.image_url ?? {}).find(isNonNullish) ?? null,
        data: toJsonValue(skill)
      };

      await this.prisma.crewSkill.upsert({ where: { skill: skill.skill }, create: { skill: skill.skill, ...data }, update: data });
    }

    const roles = keyedEntries(await this.clients.bulk.encyclopedia.crewroles()).flatMap(([role, value]) => {
      const parsed = crewRoleSchema.safeParse(value);

      return parsed.success ? [{ role, ...parsed.data }] : [];
    });

    for (const role of roles) {
      const data = { name: role.name, skills: role.skills ?? [] };

      await this.prisma.crewRole.upsert({ where: { role: role.role }, create: { role: role.role, ...data }, update: data });
    }

    return skills.length + roles.length;
  }
}
