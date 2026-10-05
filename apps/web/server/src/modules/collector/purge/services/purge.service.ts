import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { PurgeAccountPayload } from '../../contracts';
import type { DeleteAccountRowsInput, ErasePurgedAccountInput, PurgeAccountInput, PurgeRelationalInput, ReleaseRequestInput } from '../purge.types';
import type { PurgeQueries } from '../queries/purge.types';

import { errorMessage } from '../../../../common/lib';
import { asPrismaTransaction, ObjectStorage, PrismaService } from '../../../../core';
import { JOB, QUEUE } from '../../contracts';
import { PURGE, PURGE_TOKENS } from '../config/purge.constants';

@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE.purge) private readonly queue: Queue,
    private readonly storage: ObjectStorage,
    @Inject(PURGE_TOKENS.purgeQueries) private readonly queries: PurgeQueries
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

  async purgeAccount({ accountId, requestId, isFinalAttempt }: PurgeAccountInput): Promise<void> {
    if (requestId && !(await this.claim(requestId))) {
      this.logger.log(`skipped the purge of account ${accountId}: its request ${requestId} was superseded`);

      return;
    }

    try {
      await this.erase({ accountId, requestId });
    } catch (error) {
      if (requestId) {
        await this.release({ requestId, error, isFinalAttempt });
      }

      throw error;
    }
  }

  private async erase({ accountId, requestId }: ErasePurgedAccountInput): Promise<void> {
    await this.queries.deleteAccountTimeSeries({ db: this.prisma.$kysely, accountId });

    const recorded = await this.prisma.replay.findMany({
      where: { accountId: BigInt(accountId) },
      select: { id: true, storageKey: true, timelineKey: true }
    });

    const isPurged = await this.prisma.$transaction(async (tx) =>
      this.purgeRelational({ tx: asPrismaTransaction(tx), accountId, requestId, replayIds: recorded.map((replay) => replay.id) })
    );

    if (isPurged) {
      await this.removeFiles(recorded.flatMap((replay) => (replay.timelineKey ? [replay.storageKey, replay.timelineKey] : [replay.storageKey])));
    }

    this.logger.log(isPurged ? `purged account ${accountId}` : `kept account ${accountId}: it was re-linked while its purge ran`);
  }

  private async purgeRelational({ tx, accountId, requestId, replayIds }: PurgeRelationalInput): Promise<boolean> {
    if (requestId) {
      const closed = await tx.dataDeletionRequest.updateMany({
        where: { id: requestId, status: 'processing' },
        data: { status: 'completed', completedAt: new Date(), failedAt: null, error: null }
      });

      if (closed.count === 0) {
        return false;
      }
    }

    await this.deleteAccountRows({ tx, accountId, replayIds });

    return true;
  }

  private async deleteAccountRows({ tx, accountId, replayIds }: DeleteAccountRowsInput): Promise<void> {
    const id = BigInt(accountId);

    await tx.clanMemberEvent.deleteMany({ where: { accountId: id } });
    await tx.weeklyChallengeProgress.deleteMany({ where: { accountId: id } });
    await tx.clanAttendance.deleteMany({ where: { accountId: id } });
    await tx.recruitCandidate.deleteMany({ where: { accountId: id } });
    await tx.competitionEntry.deleteMany({ where: { accountId: id } });
    await tx.replay.deleteMany({ where: { id: { in: [...replayIds] } } });
    await tx.replay.updateMany({ where: { accountId: id }, data: { accountId: null } });
    await this.queries.scrubReplayPlayer({ db: tx.$kysely, accountId, placeholder: PURGE.anonymousReplayName });
    await this.queries.removeAccountFromReplayPlayers({ db: tx.$kysely, accountId });
    await this.queries.removeAccountFromRngPlayers({ db: tx.$kysely, accountId });
    await tx.player.deleteMany({ where: { accountId: id } });
  }

  private async release({ requestId, error, isFinalAttempt }: ReleaseRequestInput): Promise<void> {
    await this.prisma.dataDeletionRequest.updateMany({
      where: { id: requestId, status: 'processing' },
      data: isFinalAttempt
        ? { status: 'failed', failedAt: new Date(), error: errorMessage(error) }
        : { status: 'pending', error: errorMessage(error) }
    });
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
