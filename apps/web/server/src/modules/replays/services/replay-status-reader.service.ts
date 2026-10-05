import { Injectable } from '@nestjs/common';
import { indexBy, unique } from 'remeda';

import type { ModReplayStatuses, ModReplayStatusInput } from '../replays.types';

import { toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { toModReplayStatus } from '../mappers/mod-replay-status.mappers';
import { MOD_REPLAY_STATUS_SELECT } from '../selects/mod-replay-status.selects';

@Injectable()
export class ReplayStatusReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async forDevice({ device, replayIds }: ModReplayStatusInput): Promise<ModReplayStatuses> {
    const ids = unique(replayIds);

    const rows = await this.prisma.replay.findMany({
      where: { id: { in: ids }, uploaderUserId: device.userId, OR: [{ deviceId: device.id }, { accountId: device.accountId }] },
      select: MOD_REPLAY_STATUS_SELECT
    });

    const rowOf = indexBy(rows, (row) => row.id);

    return {
      account_id: toNumber(device.accountId),
      replays: ids.flatMap((id) => {
        const row = rowOf[id];

        return row ? [toModReplayStatus(row)] : [];
      })
    };
  }
}
