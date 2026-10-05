import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { LESTA_API } from '../../../../lib/lesta';
import { ENROL_PRIORITY, JOB } from '../../contracts';
import { CollectorProducerService } from '../collector-producer.service';

const createProducer = () => {
  const enrolQueue = mock<Queue>();
  const pollQueue = mock<Queue>();

  return { enrolQueue, pollQueue, producer: new CollectorProducerService(enrolQueue, pollQueue) };
};

describe('CollectorProducerService', () => {
  it('queues each account once with a stable job id and the requested priority', async () => {
    const { enrolQueue, producer } = createProducer();

    await producer.enrolMany({ accountIds: [7, 7, 8], priority: 'high', reason: 'login' });

    const [jobs] = enrolQueue.addBulk.mock.calls[0] ?? [];

    expect(jobs?.map((job) => job.data)).toEqual([
      { accountId: 7, reason: 'login' },
      { accountId: 8, reason: 'login' }
    ]);

    expect(jobs?.every((job) => job.name === JOB.enrol.enrol && job.opts?.priority === ENROL_PRIORITY.high)).toBe(true);
    expect(new Set(jobs?.map((job) => job.opts?.jobId)).size).toBe(2);
  });

  it('drops an enrol job once it finally fails so its stable id can be queued again', async () => {
    const { enrolQueue, producer } = createProducer();

    await producer.enrol({ accountId: 7 });

    const [jobs] = enrolQueue.addBulk.mock.calls[0] ?? [];

    expect(jobs?.every((job) => job.opts?.removeOnFail === true)).toBe(true);
  });

  it('does not touch the queue for an empty list', async () => {
    const { enrolQueue, pollQueue, producer } = createProducer();

    await producer.enrolMany({ accountIds: [] });
    await producer.poll({ accountIds: [] });

    expect(enrolQueue.addBulk).not.toHaveBeenCalled();
    expect(pollQueue.addBulk).not.toHaveBeenCalled();
  });

  it('splits a poll into batches the Lesta API accepts', async () => {
    const { pollQueue, producer } = createProducer();
    const accountIds = Array.from({ length: LESTA_API.batchSize * 2 + 1 }, (_, index) => index + 1);

    await producer.poll({ accountIds });

    const [jobs] = pollQueue.addBulk.mock.calls[0] ?? [];

    expect(jobs).toHaveLength(3);
    expect(jobs?.every((job) => job.data.accountIds.length <= LESTA_API.batchSize)).toBe(true);
  });

  it('swallows a queue failure so the request that triggered it still succeeds', async () => {
    const { enrolQueue, producer } = createProducer();

    enrolQueue.addBulk.mockRejectedValue(new Error('redis down'));

    await expect(producer.enrol({ accountId: 1 })).resolves.toBeUndefined();
  });
});
