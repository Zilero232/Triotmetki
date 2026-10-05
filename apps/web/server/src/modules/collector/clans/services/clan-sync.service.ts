import { Inject, Injectable } from '@nestjs/common';

import type { LestaClients } from '../../../../core';
import type { WebhookEmitter } from '../../../webhooks';
import type { ClanRefreshPayload } from '../../contracts';
import type { AnnounceRosterInput, ClanFieldsInput, ClanRoster, RosterOfInput, SyncClanInput, WriteRosterInput } from '../clans.types';

import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { WEBHOOK_EMITTER } from '../../../webhooks';
import { PurgeGuardService } from '../../purge';
import { clanInfoFields } from '../lib/clan-info/clan-info';
import { clanMemberEvents, diffClanRoster, rosterChanges } from '../lib/clan-roster';
import { toCurrentMember, toPopulationPlayer } from '../mappers/clan-member.mappers';
import { ClanSnapshotSyncService } from './clan-snapshot-sync.service';

@Injectable()
export class ClanSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guard: PurgeGuardService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    @Inject(WEBHOOK_EMITTER) private readonly webhooks: WebhookEmitter,
    private readonly snapshots: ClanSnapshotSyncService
  ) {}

  async refresh({ clanIds, snapshot }: ClanRefreshPayload) {
    const infos = await this.clients.bulk.clans.info({ clanIds });
    const now = new Date();
    let events = 0;

    for (const clanId of clanIds) {
      const info = infos[String(clanId)] ?? null;

      events += await this.syncClan({ clanId, info, now });
    }

    if (snapshot) {
      await this.snapshots.snapshot({ clanIds, infos, now });
    }

    return { clans: clanIds.length, events };
  }

  private async syncClan({ clanId, info, now }: SyncClanInput): Promise<number> {
    const id = BigInt(clanId);
    const exists = await this.prisma.clan.findUnique({ where: { clanId: id }, select: { clanId: true } });

    if (!info && !exists) {
      return 0;
    }

    const disbanded = !info || info.is_clan_disbanded === true;
    const roster = await this.rosterOf({ id, members: disbanded ? [] : (info.members ?? []) });
    const events = exists ? clanMemberEvents({ clanId: id, diff: roster.diff, now }) : [];

    await this.writeRoster({ id, info, disbanded, roster, events, now });
    await this.announceRoster({ clanId, info, events });

    return events.length;
  }

  private async rosterOf({ id, members }: RosterOfInput): Promise<ClanRoster> {
    const blocked = await this.guard.blocked(members.map((member) => member.account_id));
    const allowed = members.filter((member) => !blocked.has(member.account_id));

    const current = allowed.map(toCurrentMember);

    const stored = await this.prisma.clanMember.findMany({ where: { clanId: id }, select: { accountId: true, role: true } });

    return {
      current,
      diff: diffClanRoster({ stored, current }),
      names: new Map(allowed.map((member) => [member.account_id, member.account_name]))
    };
  }

  private async writeRoster({ id, info, disbanded, roster, events, now }: WriteRosterInput) {
    const { current, diff, names } = roster;
    const changed = [...diff.joined, ...current.filter((member) => diff.roleChanged.some((change) => change.accountId === member.accountId))];

    await this.prisma.$transaction(async (tx) => {
      const clan = this.clanFields({ info, disbanded, membersCount: current.length, now });

      await tx.clan.upsert({ where: { clanId: id }, create: { clanId: id, tag: info?.tag ?? '', name: info?.name ?? '', ...clan }, update: clan });

      await tx.player.createMany({
        data: diff.joined.map((member) => toPopulationPlayer({ member, nickname: names.get(Number(member.accountId)), clanId: id })),
        skipDuplicates: true
      });

      await tx.player.updateMany({ where: { accountId: { in: diff.joined.map((member) => member.accountId) } }, data: { clanId: id } });
      await tx.player.updateMany({ where: { accountId: { in: diff.left }, clanId: id }, data: { clanId: null } });
      await tx.clanMember.deleteMany({ where: { clanId: id, accountId: { in: diff.left } } });

      for (const member of changed) {
        const data = { clanId: id, role: member.role, joinedAt: member.joinedAt };

        await tx.clanMember.upsert({ where: { accountId: member.accountId }, create: { accountId: member.accountId, ...data }, update: data });
      }

      await tx.clanMemberEvent.createMany({ data: events });
    });
  }

  private async announceRoster({ clanId, info, events }: AnnounceRosterInput) {
    if (events.length === 0) {
      return;
    }

    const changes = rosterChanges(events);

    await this.webhooks.emit({
      event: 'clan.member_changed',
      subject: { accountIds: changes.map((change) => change.accountId), clanIds: [clanId] },
      data: { clanId, tag: info?.tag ?? null, changes }
    });
  }

  private clanFields({ info, disbanded, membersCount, now }: ClanFieldsInput) {
    return {
      ...(info ? clanInfoFields(info) : {}),
      membersCount,
      isDisbanded: disbanded,
      lastPolledAt: now
    };
  }
}
