import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { accountWn8 } from '@otmetki/ratings';
import { fromUnixTime } from 'date-fns';
import { mapValues, sortBy } from 'remeda';

import type { WebhookEmitter } from '../../webhooks';
import type { IngestResponse } from '../lib/contract';
import type { BattleEventInput, BattleEventsSink, IngestInput, LedgeredEventInput, MarkGainedInput, SessionRef, SessionSummary } from '../mod.types';

import { errorMessage } from '../../../common/lib';
import { isUniqueViolationOn, PrismaService } from '../../../core';
import { ExpectedValuesReaderService } from '../../reference';
import { markGainedKey, WEBHOOK_EMITTER } from '../../webhooks';
import { BATTLE_EVENTS } from '../config/battle-events.constants';
import { MOD_INGEST } from '../config/ingest.constants';
import { countsForSession, moePercent, sessionIncrement, sessionUuid } from '../lib/battle';
import { sessionTankTotals } from '../lib/session-tanks';
import { toBattleData, toPlayerTankMoe } from '../mappers/battle.mappers';
import { EventLedgerService } from './event-ledger.service';

@Injectable()
export class ModIngestWriterService {
  private readonly logger = new Logger(ModIngestWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: EventLedgerService,
    private readonly expected: ExpectedValuesReaderService,
    @Inject(WEBHOOK_EMITTER) private readonly webhooks: WebhookEmitter,
    @Optional() @Inject(BATTLE_EVENTS) private readonly battleEvents: BattleEventsSink | null = null
  ) {}

  async ingest({ device, batch }: IngestInput): Promise<IngestResponse> {
    let accepted = 0;
    let duplicates = 0;
    let lastSession: SessionRef | null = null;

    for (const event of sortBy(batch.events, (candidate) => candidate.occurred_at)) {
      const fresh = event.type === 'battle_result' ? await this.battle({ device, event }) : await this.ledgered({ device, event });

      if (fresh) {
        accepted += 1;
      } else {
        duplicates += 1;
      }

      if (event.type === 'battle_result' && event.session_id && countsForSession(event)) {
        lastSession = { id: sessionUuid({ accountId: device.accountId, sessionId: event.session_id }), modId: event.session_id };
      }
    }

    await this.prisma.modDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), modVersion: batch.mod_version, gameVersion: batch.client_version }
    });

    const session = lastSession ? await this.summarize(lastSession) : null;

    return { accepted, duplicates, ...(session ? { session } : {}) };
  }

  private async battle({ device, event }: BattleEventInput): Promise<boolean> {
    const { accountId } = device;
    const tankId = event.vehicle.tank_id;
    const sessionId = event.session_id && countsForSession(event) ? sessionUuid({ accountId, sessionId: event.session_id }) : null;
    const startedAt = fromUnixTime(event.arena_created_at);
    let previousMarks: number | null = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const previous = event.moe
          ? await tx.playerTank.findUnique({ where: { accountId_tankId: { accountId, tankId } }, select: { marksOnGun: true, moePercent: true } })
          : null;

        previousMarks = previous?.marksOnGun ?? null;

        if (sessionId) {
          await tx.playSession.createMany({
            data: [{ id: sessionId, accountId, source: 'mod', kind: 'live', status: 'open', startedAt, credits: 0 }],
            skipDuplicates: true
          });
        }

        await tx.battle.create({
          data: toBattleData({ event, accountId, deviceId: device.id, sessionId, previousMoePercent: previous?.moePercent ?? null })
        });

        if (sessionId) {
          await tx.playSession.update({
            where: { id: sessionId },
            data: { ...mapValues(sessionIncrement(event), (value) => ({ increment: value })), lastActivityAt: new Date(), status: 'open' }
          });
        }

        if (event.moe) {
          const values = toPlayerTankMoe({ moe: event.moe, previousMarks: previous?.marksOnGun });

          await tx.playerTank.upsert({
            where: { accountId_tankId: { accountId, tankId } },
            create: { accountId, tankId, ...values, marksSource: 'mod' },
            update: values
          });
        }
      });

      if (event.moe) {
        await this.markGained({
          accountId,
          tankId,
          marks: event.moe.marks_on_gun,
          previous: previousMarks,
          percent: moePercent(event.moe.damage_rating)
        });
      }

      return true;
    } catch (error) {
      if (isUniqueViolationOn({ error, constraint: MOD_INGEST.battleUniqueConstraint })) {
        return false;
      }

      throw error;
    }
  }

  private async ledgered({ device, event }: LedgeredEventInput): Promise<boolean> {
    const key = { accountId: device.accountId, eventId: event.event_id };

    if (!(await this.ledger.claim(key))) {
      return false;
    }

    try {
      if (event.type === 'battle_start') {
        await this.battleEvents?.started({ accountId: device.accountId, tankId: event.tank_id, occurredAt: fromUnixTime(event.occurred_at) });
      }

      if (event.type === 'moe_snapshot') {
        const where = { accountId_tankId: { accountId: device.accountId, tankId: event.tank_id } };
        const previous = await this.prisma.playerTank.findUnique({ where, select: { marksOnGun: true } });
        const values = toPlayerTankMoe({ moe: event, previousMarks: previous?.marksOnGun });

        await this.prisma.playerTank.upsert({
          where,
          create: { accountId: device.accountId, tankId: event.tank_id, ...values, marksSource: 'mod' },
          update: values
        });

        await this.markGained({
          accountId: device.accountId,
          tankId: event.tank_id,
          marks: values.marksOnGun,
          previous: previous?.marksOnGun ?? null,
          percent: values.moePercent
        });
      }

      return true;
    } catch (error) {
      await this.ledger.release(key);

      throw error;
    }
  }

  private async markGained({ accountId, tankId, marks, previous, percent }: MarkGainedInput): Promise<void> {
    if (previous === null || marks <= previous) {
      return;
    }

    const player = await this.prisma.player.findUnique({ where: { accountId }, select: { clanId: true, nickname: true, isHidden: true } });

    if (player?.isHidden) {
      return;
    }

    try {
      await this.webhooks.emit({
        event: 'mark.gained',
        dedupeKey: markGainedKey({ accountId, tankId, marks }),
        subject: { accountIds: [Number(accountId)], clanIds: player?.clanId ? [Number(player.clanId)] : [] },
        data: { accountId: Number(accountId), nickname: player?.nickname ?? null, tankId, marks, previousMarks: previous, percent, source: 'mod' }
      });
    } catch (error) {
      this.logger.warn(`mark.gained webhooks not queued: ${errorMessage(error)}`);
    }
  }

  private async summarize({ id, modId }: SessionRef): Promise<SessionSummary | null> {
    const battles = await this.prisma.battle.findMany({
      where: { sessionId: id },
      select: { tankId: true, result: true, damageDealt: true, frags: true, spotted: true }
    });

    if (battles.length === 0) {
      return null;
    }

    const expected = await this.expected.all();
    const { wn8 } = accountWn8({ tanks: sessionTankTotals(battles), expected });

    await this.prisma.playSession.update({ where: { id }, data: { wn8 } });

    return { session_id: modId, wn8, battles: battles.length };
  }
}
