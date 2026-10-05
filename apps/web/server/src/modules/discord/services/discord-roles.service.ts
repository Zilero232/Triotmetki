import { API } from '@discordjs/core';
import { Inject, Injectable, Logger } from '@nestjs/common';

import type { ApplyRolesInput, SyncGuildInput, SyncMemberInput } from '../discord.types';
import type { MemberStanding } from '../lib';

import { errorMessage } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { AUTH_PROVIDER } from '../../../lib/auth';
import { USER_LESTA_ACCOUNT_ORDER } from '../../accounts';
import { EntitlementsService } from '../../billing';
import { DISCORD_LIMITS, DISCORD_TOKENS } from '../config';
import { desiredRoles, isUnknownMember, readTierRoles, roleChanges } from '../lib';

@Injectable()
export class DiscordRolesService {
  private readonly logger = new Logger(DiscordRolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    @Inject(DISCORD_TOKENS.api) private readonly api: API | null
  ) {}

  async syncAll(): Promise<number> {
    const guilds = await this.prisma.discordGuild.findMany({ include: { members: { select: { discordUserId: true } } } });
    let synced = 0;

    for (const guild of guilds) {
      synced += await this.syncGuild({ guild }).catch((error: unknown) => {
        this.logger.warn(`discord roles of guild ${guild.guildId} failed: ${errorMessage(error)}`);

        return 0;
      });
    }

    return synced;
  }

  async syncGuild({ guild }: SyncGuildInput): Promise<number> {
    const withTiers = await this.entitlements.isPlus(guild.boundByUserId);
    const clanLinked = await this.prisma.account.findMany({
      where: { providerId: AUTH_PROVIDER.discord, user: { lestaAccounts: { some: { player: { clanMembership: { clanId: guild.clanId } } } } } },
      select: { accountId: true },
      take: DISCORD_LIMITS.roleSyncBatch
    });

    const candidates = new Set([...guild.members.map((member) => member.discordUserId), ...clanLinked.map((account) => account.accountId)]);
    let synced = 0;

    for (const discordUserId of candidates) {
      synced += (await this.syncMember({ guild, discordUserId, withTiers })) ? 1 : 0;
    }

    return synced;
  }

  async syncMember(input: SyncMemberInput): Promise<boolean> {
    return this.apply({ ...input, standing: await this.standingOf(input.discordUserId) });
  }

  private async apply({ guild, discordUserId, withTiers, standing }: ApplyRolesInput): Promise<boolean> {
    if (!this.api) {
      return false;
    }

    const binding = { clanId: guild.clanId, memberRoleId: guild.memberRoleId, tierRoles: withTiers ? readTierRoles(guild.tierRoles) : {} };
    const key = { guildId_discordUserId: { guildId: guild.guildId, discordUserId } };
    const row = await this.prisma.discordGuildMember.findUnique({ where: key });
    const granted = row?.roleIds ?? [];
    const { add, remove } = roleChanges({ binding, granted, desired: standing ? desiredRoles({ binding, member: standing }) : [] });

    try {
      for (const roleId of add) {
        await this.api.guilds.addRoleToMember(guild.guildId, discordUserId, roleId);
      }

      for (const roleId of remove) {
        await this.api.guilds.removeRoleFromMember(guild.guildId, discordUserId, roleId);
      }
    } catch (error) {
      if (isUnknownMember(error)) {
        await this.prisma.discordGuildMember.deleteMany({ where: { guildId: guild.guildId, discordUserId } });

        return false;
      }

      throw error;
    }

    const roleIds = [...granted.filter((roleId) => !remove.includes(roleId)), ...add];

    await this.prisma.discordGuildMember.upsert({
      where: key,
      create: { guildId: guild.guildId, discordUserId, roleIds },
      update: { roleIds }
    });

    return true;
  }

  private async standingOf(discordUserId: string): Promise<MemberStanding | null> {
    const account = await this.prisma.account.findUnique({
      where: { providerId_accountId: { providerId: AUTH_PROVIDER.discord, accountId: discordUserId } },
      select: {
        user: {
          select: {
            lestaAccounts: {
              orderBy: USER_LESTA_ACCOUNT_ORDER,
              take: 1,
              select: { accountId: true, player: { select: { clanMembership: { select: { clanId: true } } } } }
            }
          }
        }
      }
    });

    const [primary] = account?.user.lestaAccounts ?? [];

    if (!primary) {
      return null;
    }

    const rating = await this.prisma.accountRating.findUnique({
      where: { accountId_period: { accountId: primary.accountId, period: 'overall' } },
      select: { wn8: true }
    });

    return { clanId: primary.player.clanMembership?.clanId ?? null, wn8: rating?.wn8 ?? null };
  }
}
