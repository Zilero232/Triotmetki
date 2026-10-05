import { API } from '@discordjs/core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RATING_TIERS } from '@otmetki/ratings';
import { isIncludedIn } from 'remeda';

import type { CommandContext, EnsureTierRolesInput, RecordSeenInput } from '../discord.types';
import type { TierRoles } from '../lib';

import { errorMessage } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { WORKSPACE_ROLES } from '../../clan-workspace';
import { DISCORD_OPTIONS, DISCORD_TOKENS } from '../config';
import { booleanOption, canManageGuild, readTierRoles, stringOption } from '../lib';
import { DiscordCopyService } from './discord-copy.service';
import { DiscordRolesService } from './discord-roles.service';

@Injectable()
export class DiscordGuildsService {
  private readonly logger = new Logger(DiscordGuildsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly roles: DiscordRolesService,
    private readonly copy: DiscordCopyService,
    @Inject(DISCORD_TOKENS.api) private readonly api: API | null
  ) {}

  async setup({ interaction, locale, linked }: CommandContext): Promise<string> {
    const guildId = interaction.guild_id;
    const options = interaction.data.options;

    if (!guildId) {
      return this.copy.t({ locale, key: 'guild-only' });
    }

    if (!canManageGuild(interaction.member?.permissions)) {
      return this.copy.t({ locale, key: 'setup-not-manager' });
    }

    if (!linked?.accountId) {
      return this.copy.t({ locale, key: 'setup-not-linked' });
    }

    const member = await this.prisma.clanMember.findUnique({
      where: { accountId: linked.accountId },
      select: { role: true, clanId: true, clan: { select: { tag: true } } }
    });

    if (!member || !isIncludedIn(member.role, WORKSPACE_ROLES.officers)) {
      return this.copy.t({ locale, key: 'setup-not-officer' });
    }

    const channelId = stringOption({ options, name: DISCORD_OPTIONS.channel });
    const reportChannelId = stringOption({ options, name: DISCORD_OPTIONS.reportChannel });
    const wantsTierRoles = booleanOption({ options, name: DISCORD_OPTIONS.tierRoles });
    const [isPlus, existing] = await Promise.all([
      this.entitlements.isPlus(linked.userId),
      this.prisma.discordGuild.findUnique({ where: { guildId }, select: { tierRoles: true } })
    ]);

    const tierRoles = wantsTierRoles && isPlus ? await this.ensureTierRoles({ guildId, locale, current: existing?.tierRoles }) : {};

    const data = {
      clanId: member.clanId,
      boundByUserId: linked.userId,
      locale,
      channelId,
      reportChannelId: isPlus ? reportChannelId : null,
      memberRoleId: stringOption({ options, name: DISCORD_OPTIONS.memberRole }),
      tierRoles
    };

    const guild = await this.prisma.discordGuild.upsert({
      where: { guildId },
      create: { guildId, ...data },
      update: data,
      include: { members: { select: { discordUserId: true } } }
    });

    await this.roles.syncGuild({ guild }).catch((error: unknown) => {
      this.logger.warn(`discord roles after setup of ${guildId} failed: ${errorMessage(error)}`);
    });

    const needsPlus = !isPlus && (wantsTierRoles || reportChannelId !== null);

    return [
      this.copy.t({ locale, key: 'setup-done', vars: { tag: member.clan.tag, channel: channelId ? `<#${channelId}>` : '—' } }),
      ...(needsPlus ? [this.copy.t({ locale, key: 'setup-plus-required' })] : [])
    ].join('\n');
  }

  async syncMe({ interaction, locale, linked, discordUserId }: CommandContext): Promise<string> {
    const guildId = interaction.guild_id;

    if (!guildId) {
      return this.copy.t({ locale, key: 'guild-only' });
    }

    if (!linked) {
      return this.copy.t({ locale, key: 'roles-not-linked' });
    }

    const guild = await this.prisma.discordGuild.findUnique({ where: { guildId } });

    if (!guild) {
      return this.copy.t({ locale, key: 'roles-not-bound' });
    }

    await this.roles.syncMember({ guild, discordUserId, withTiers: await this.entitlements.isPlus(guild.boundByUserId) });

    return this.copy.t({ locale, key: 'roles-done' });
  }

  async recordSeen({ guildId, discordUserId }: RecordSeenInput): Promise<void> {
    const guild = await this.prisma.discordGuild.findUnique({ where: { guildId }, select: { guildId: true } });

    if (!guild) {
      return;
    }

    await this.prisma.discordGuildMember.upsert({
      where: { guildId_discordUserId: { guildId, discordUserId } },
      create: { guildId, discordUserId },
      update: { seenAt: new Date() }
    });
  }

  private async ensureTierRoles({ guildId, locale, current }: EnsureTierRolesInput): Promise<TierRoles> {
    const roles: TierRoles = { ...readTierRoles(current) };

    if (!this.api) {
      return roles;
    }

    for (const tier of RATING_TIERS) {
      if (roles[tier]) {
        continue;
      }

      const name = this.copy.t({ locale, key: 'tier-role', vars: { tier: this.copy.t({ locale, key: `tier-${tier}` }) } });
      const role = await this.api.guilds.createRole(guildId, { name, mentionable: false, hoist: false });

      roles[tier] = role.id;
    }

    return roles;
  }
}
