import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { AccountRatingsPayload } from '../../contracts';

import { JOB, QUEUE } from '../../contracts';
import { TRACKING } from '../config/tracking.constants';

@Injectable()
export class RatingsTriggerService {
  constructor(@InjectQueue(QUEUE.aggregate) private readonly queue: Queue) {}

  async request(accountIds: readonly number[]) {
    if (accountIds.length === 0) {
      return;
    }

    await this.queue.addBulk(
      accountIds.map((accountId) => ({
        name: JOB.aggregate.accountRatings,
        data: { accountId } satisfies AccountRatingsPayload,
        opts: { delay: TRACKING.ratingsDebounceMs, deduplication: { id: `ratings:${accountId}` } }
      }))
    );
  }
}
