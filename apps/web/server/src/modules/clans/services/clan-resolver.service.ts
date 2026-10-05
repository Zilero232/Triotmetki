import { Inject, Injectable } from '@nestjs/common';

import type { ClanInfo, LestaClient } from '../../../lib/lesta';

import { AppNotFoundException } from '../../../common/exceptions';
import { clanRoleToDb, fromUnixSeconds, insensitiveEquals } from '../../../common/lib';
import { LESTA_CLIENT, PrismaService } from '../../../core';
import { isSearchRejected } from '../../../lib/lesta';
import { clanInfoFields, CollectorProducerService, PurgeGuardService } from '../../collector';
import { CLAN_PAGE } from '../config/clan-page.constants';

@Injectable()
export class ClanResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collector: CollectorProducerService,
    private readonly purgeGuard: PurgeGuardService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient
  ) {}

  async resolve(idOrTag: string): Promise<bigint> {
    if (CLAN_PAGE.numericId.test(idOrTag)) {
      return this.ensure(BigInt(idOrTag));
    }

    const local = await this.prisma.clan.findFirst({
      where: { tag: insensitiveEquals(idOrTag), isDisbanded: false },
      select: { clanId: true }
    });

    if (local) {
      return local.clanId;
    }

    const found = await this.lesta.clans.list({ search: idOrTag, limit: CLAN_PAGE.tagSearchLimit }).catch((error: unknown) => {
      if (isSearchRejected(error)) {
        return [];
      }

      throw error;
    });

    const exact = found.find((clan) => clan.tag.toLowerCase() === idOrTag.toLowerCase());

    if (!exact) {
      throw new AppNotFoundException('CLAN_NOT_FOUND', `No clan tagged ${idOrTag}`);
    }

    return this.ensure(BigInt(exact.clan_id));
  }

  async ensure(clanId: bigint): Promise<bigint> {
    const existing = await this.prisma.clan.findUnique({ where: { clanId }, select: { clanId: true } });

    if (existing) {
      return clanId;
    }

    const response = await this.lesta.clans.info({ clanIds: [Number(clanId)] });
    const info = response[String(clanId)];

    if (!info) {
      throw new AppNotFoundException('CLAN_NOT_FOUND', `No clan with id ${clanId}`);
    }

    await this.store(info);

    return clanId;
  }

  private async store(info: ClanInfo): Promise<void> {
    const clanId = BigInt(info.clan_id);
    const blocked = await this.purgeGuard.blocked((info.members ?? []).map((member) => member.account_id));
    const members = (info.members ?? []).filter((member) => !blocked.has(member.account_id));

    const data = {
      ...clanInfoFields(info),
      membersCount: info.members_count,
      isDisbanded: info.is_clan_disbanded ?? false,
      lastPolledAt: new Date()
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.clan.upsert({ where: { clanId }, create: { clanId, ...data }, update: data });

      await tx.player.createMany({
        data: members.map((member) => ({ accountId: BigInt(member.account_id), nickname: member.account_name, clanId })),
        skipDuplicates: true
      });

      const rows = members.map((member) => ({
        accountId: BigInt(member.account_id),
        clanId,
        role: clanRoleToDb(member.role) ?? CLAN_PAGE.defaultRole,
        joinedAt: fromUnixSeconds(member.joined_at)
      }));

      if (rows.length > 0) {
        await tx.clanMember.deleteMany({ where: { accountId: { in: rows.map((row) => row.accountId) } } });
        await tx.clanMember.createMany({ data: rows });
      }
    });

    await this.collector.enrolMany({ accountIds: members.map((member) => member.account_id), priority: 'normal' });
  }
}
