import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { unique } from 'remeda';

import type { AccountBatchPayload, EnrolPayload } from '../contracts';
import type { EnrolInput, EnrolManyInput, PollInput } from './producer.types';

import { errorMessage } from '../../../common/lib';
import { chunkIds } from '../../../lib/lesta';
import { ENROL_PRIORITY, JOB, QUEUE } from '../contracts';
import { PRODUCER } from './config';

@Injectable()
export class CollectorProducerService {
  private readonly logger = new Logger(CollectorProducerService.name);

  constructor(
    @InjectQueue(QUEUE.enrol) private readonly enrolQueue: Queue<EnrolPayload>,
    @InjectQueue(QUEUE.poll) private readonly pollQueue: Queue<AccountBatchPayload>
  ) {}

  async enrol({ accountId, priority = PRODUCER.defaultPriority, reason = PRODUCER.reason.single }: EnrolInput): Promise<void> {
    await this.enrolMany({ accountIds: [accountId], priority, reason });
  }

  async enrolMany({ accountIds, priority = PRODUCER.defaultPriority, reason = PRODUCER.reason.many }: EnrolManyInput): Promise<void> {
    const ids = unique([...accountIds]);

    if (ids.length === 0) {
      return;
    }

    try {
      await this.enrolQueue.addBulk(
        ids.map((accountId) => ({
          name: JOB.enrol.enrol,
          data: { accountId, reason },
          opts: { jobId: `${PRODUCER.enrolJobPrefix}-${accountId}`, priority: ENROL_PRIORITY[priority], removeOnComplete: true, removeOnFail: true }
        }))
      );
    } catch (error) {
      this.logger.warn(`enrol of ${ids.length} account(s) was not queued: ${errorMessage(error)}`);
    }
  }

  async poll({ accountIds }: PollInput): Promise<void> {
    const batches = chunkIds({ ids: accountIds });

    if (batches.length === 0) {
      return;
    }

    try {
      await this.pollQueue.addBulk(batches.map((batch) => ({ name: JOB.poll.batch, data: { accountIds: batch } })));
    } catch (error) {
      this.logger.warn(`poll of ${accountIds.length} account(s) was not queued: ${errorMessage(error)}`);
    }
  }
}
