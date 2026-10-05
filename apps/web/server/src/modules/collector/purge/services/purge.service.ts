import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { PurgeAccountPayload } from '../../contracts';
import type { PurgeAccountInput } from '../purge.types';

import { errorMessage } from '../../../../common/lib';
import { HYPERTABLE, ObjectStorage, PrismaService } from '../../../../core';
import { JOB, QUEUE } from '../../contracts';
import { PURGE } from '../config';
import { scrubReplayPlayerSql } from '../queries';

@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE.purge) private readonly queue: Queue,
    private readonly storage: ObjectStorage
  ) {}

  async dispatch(): Promise<number> {
    const retryAfter = new Date(Date.now() - PURGE.failedCooldownMs);

    const due = await this.prisma.dataDeletionRequest.findMany({
      where: { OR: [{ status: 'pending' }, { status: 'failed', failedAt: { lte: retryAfter } }] },
      orderBy: { requestedAt: 'asc' },
      take: PURGE.dispatchBatch
    });

    await this.queue.addBulk(
      due.map((request) => ({
        name: JOB.purge.account,
        data: { accountId: Number(request.accountId), requestId: request.id } satisfies PurgeAccountPayload,
        opts: { jobId: `purge-${request.id}`, removeOnFail: true }
      }))
    );

    return due.length;
  }

  async purgeAccount({ accountId, requestId, isFinalAttempt }: PurgeAccountInput) {
    const id = BigInt(accountId);

    if (requestId && !(await this.claim(requestId))) {
      this.logger.log(`skipped the purge of account ${accountId}: its request ${requestId} was superseded`);

      return;
    }

    try {
      for (const table of Object.values(HYPERTABLE)) {
        await this.prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE account_id = $1`, id);
      }

      const recorded = await this.prisma.replay.findMany({ where: { accountId: id }, select: { id: true, storageKey: true, timelineKey: true } });

      const isPurged = await this.prisma.$transaction(async (tx) => {
        if (requestId) {
          const closed = await tx.dataDeletionRequest.updateMany({
            where: { id: requestId, status: 'processing' },
            data: { status: 'completed', completedAt: new Date(), failedAt: null, error: null }
          });

          if (closed.count === 0) {
            return false;
          }
        }

        await tx.clanMemberEvent.deleteMany({ where: { accountId: id } });
        await tx.weeklyChallengeProgress.deleteMany({ where: { accountId: id } });
        await tx.clanAttendance.deleteMany({ where: { accountId: id } });
        await tx.recruitCandidate.deleteMany({ where: { accountId: id } });
        await tx.competitionEntry.deleteMany({ where: { accountId: id } });
        await tx.replay.deleteMany({ where: { id: { in: recorded.map((replay) => replay.id) } } });
        await tx.replay.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.$executeRaw(scrubReplayPlayerSql({ accountId: id, placeholder: PURGE.anonymousReplayName }));
        await tx.$executeRaw`UPDATE replay SET player_account_ids = array_remove(player_account_ids, ${id}) WHERE player_account_ids @> ARRAY[${id}]::bigint[]`;
        await tx.$executeRaw`UPDATE rng_daily SET players = array_remove(players, ${id}) WHERE players @> ARRAY[${id}]::bigint[]`;
        await tx.player.deleteMany({ where: { accountId: id } });

        return true;
      });

      if (isPurged) {
        await this.removeFiles(recorded.flatMap((replay) => (replay.timelineKey ? [replay.storageKey, replay.timelineKey] : [replay.storageKey])));
      }

      this.logger.log(isPurged ? `purged account ${accountId}` : `kept account ${accountId}: it was re-linked while its purge ran`);
    } catch (error) {
      if (requestId) {
        await this.prisma.dataDeletionRequest.updateMany({
          where: { id: requestId, status: 'processing' },
          data: isFinalAttempt
            ? { status: 'failed', failedAt: new Date(), error: errorMessage(error) }
            : { status: 'pending', error: errorMessage(error) }
        });
      }

      throw error;
    }
  }

  private async removeFiles(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.storage.remove(key);
      } catch (error) {
        this.logger.warn(`purged replay file ${key} not removed: ${errorMessage(error)}`);
      }
    }
  }

  private async claim(requestId: string): Promise<boolean> {
    const claimed = await this.prisma.dataDeletionRequest.updateMany({
      where: { id: requestId, status: { in: [...PURGE.claimableStatuses] } },
      data: { status: 'processing' }
    });

    return claimed.count > 0;
  }
}
