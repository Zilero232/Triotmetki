import { Inject, Injectable, Logger } from '@nestjs/common';
import { mapValues } from 'remeda';

import type { LestaClients } from '../../../../core';
import type { LestaClient } from '../../../../lib/lesta';
import type { PollLestaPort } from '../lib/poll-pipeline/poll-pipeline.types';
import type { WithModeExtraInput } from '../tracking.types';

import { LESTA_CLIENTS } from '../../../../core';
import { accountInfoSchema, isExtraRejected, tankStatsSchema } from '../../../../lib/lesta';
import { TRACKING } from '../config/tracking.constants';

@Injectable()
export class TrackingLestaService {
  private readonly logger = new Logger(TrackingLestaService.name);
  private hasModeExtra = true;

  constructor(@Inject(LESTA_CLIENTS) private readonly clients: LestaClients) {}

  port(lane: keyof LestaClients): PollLestaPort {
    const client: LestaClient = this.clients[lane];

    return {
      accountInfo: async (accountIds) => {
        const infos = await this.withModeExtra({
          base: TRACKING.lesta.accountExtra,
          modes: TRACKING.lesta.accountModeExtra,
          run: (extra) => client.account.info({ accountIds, extra, fields: TRACKING.lesta.accountFields })
        });

        return mapValues(infos, (info) => (info ? accountInfoSchema.parse(info) : null));
      },
      accountTanks: (accountIds) => client.account.tanks({ accountIds }),
      tankStats: async ({ accountId, tankIds }) => {
        const stats = await this.withModeExtra({
          base: TRACKING.lesta.tankExtra,
          modes: TRACKING.lesta.tankModeExtra,
          run: (extra) => client.tanks.stats({ accountId, tankIds, extra, fields: TRACKING.lesta.tankFields })
        });

        return stats.map((row) => tankStatsSchema.parse(row));
      },
      tankMarks: async ({ accountId, tankIds }) => {
        const rows = await client.tanks.achievements({ accountId, tankIds, fields: TRACKING.lesta.marksFields });

        return new Map(
          rows.flatMap((row) => (row.tank_id === undefined ? [] : [[row.tank_id, row.achievements?.[TRACKING.lesta.marksAchievement] ?? 0]]))
        );
      }
    };
  }

  private async withModeExtra<T>({ base, modes, run }: WithModeExtraInput<T>): Promise<T> {
    if (!this.hasModeExtra) {
      return run(base);
    }

    try {
      return await run([...base, ...modes]);
    } catch (error) {
      if (!isExtraRejected(error)) {
        throw error;
      }

      this.hasModeExtra = false;
      this.logger.warn(`Lesta rejected the mode extras (${modes.join(', ')}); polling without them`);

      return run(base);
    }
  }
}
