import { Injectable } from '@nestjs/common';

import type { LiftUserRequestsInput, OpenDeletionRequestsInput } from '../purge.types';

import { PrismaService } from '../../../../core';
import { PURGE } from '../config/purge.constants';

@Injectable()
export class PurgeGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async blocked(accountIds: readonly number[]): Promise<Set<number>> {
    if (accountIds.length === 0) {
      return new Set();
    }

    const requests = await this.prisma.dataDeletionRequest.findMany({
      where: {
        accountId: { in: accountIds.map(BigInt) },
        source: { in: [...PURGE.blockingSources] },
        status: { in: [...PURGE.blockingStatuses] }
      },
      select: { accountId: true },
      distinct: ['accountId']
    });

    return new Set(requests.map((request) => Number(request.accountId)));
  }

  async open({ db, accountIds, source, reason }: OpenDeletionRequestsInput): Promise<void> {
    if (accountIds.length === 0) {
      return;
    }

    await db.dataDeletionRequest.createMany({ data: accountIds.map((accountId) => ({ accountId, source, reason })) });
    await db.player.updateMany({ where: { accountId: { in: [...accountIds] } }, data: { isHidden: true } });
    await db.modDevice.updateMany({ where: { accountId: { in: [...accountIds] }, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async liftUserRequests({ db, accountId }: LiftUserRequestsInput): Promise<boolean> {
    await db.dataDeletionRequest.updateMany({
      where: { accountId, source: 'user', status: { in: [...PURGE.blockingStatuses] } },
      data: { status: 'superseded', supersededAt: new Date() }
    });

    const remaining = await db.dataDeletionRequest.count({
      where: { accountId, source: { in: [...PURGE.blockingSources] }, status: { in: [...PURGE.blockingStatuses] } }
    });

    return remaining === 0;
  }
}
