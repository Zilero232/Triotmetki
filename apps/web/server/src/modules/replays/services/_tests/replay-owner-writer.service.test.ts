import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { ObjectStorage, PrismaService } from '../../../../core';

import { AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { ReplayOwnerWriterService } from '../replay-owner-writer.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const storage = mock<ObjectStorage>();
  const config = mock<AppConfigService>();

  config.get.mockReturnValue('http://localhost:4000');

  return { service: new ReplayOwnerWriterService(prisma, storage, config), prisma, storage };
};

describe('ReplayOwnerWriterService.remove', () => {
  it('deletes the row, the replay file and its timeline', async () => {
    const { service, prisma, storage } = createService();

    prisma.replay.findFirst.mockResolvedValue(mock<Replay>({ storageKey: 'replays/r1.mtreplay', timelineKey: 'replays/r1.tracks.json' }));

    await service.remove({ id: 'r1', userId: 'owner' });

    expect(prisma.replay.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r1' } }));
    expect(storage.remove.mock.calls.map(([key]) => key)).toEqual(['replays/r1.tracks.json', 'replays/r1.mtreplay']);
  });

  it('keeps the row when the storage refuses to delete the file, so the removal can be retried', async () => {
    const { service, prisma, storage } = createService();

    prisma.replay.findFirst.mockResolvedValue(mock<Replay>({ storageKey: 'replays/r1.mtreplay', timelineKey: null }));
    storage.remove.mockRejectedValue(new Error('storage down'));

    await expect(service.remove({ id: 'r1', userId: 'owner' })).rejects.toThrow('storage down');
    expect(prisma.replay.delete).not.toHaveBeenCalled();
  });

  it('removes only the replay file when there is no timeline', async () => {
    const { service, prisma, storage } = createService();

    prisma.replay.findFirst.mockResolvedValue(mock<Replay>({ storageKey: 'replays/r1.mtreplay', timelineKey: null }));

    await service.remove({ id: 'r1', userId: 'owner' });

    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it('refuses a replay uploaded by someone else and touches nothing', async () => {
    const { service, prisma, storage } = createService();

    prisma.replay.findFirst.mockResolvedValue(null);

    await expect(service.remove({ id: 'r1', userId: 'stranger' })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.replay.findFirst.mock.calls[0]?.[0]?.where).toEqual({ id: 'r1', uploaderUserId: 'stranger' });
    expect(prisma.replay.delete).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});

describe('ReplayOwnerWriterService.updateVisibility', () => {
  it('refuses to change the visibility of a replay the user does not own', async () => {
    const { service, prisma } = createService();

    prisma.replay.findFirst.mockResolvedValue(null);

    await expect(service.updateVisibility({ id: 'r1', userId: 'stranger', visibility: 'private' })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.replay.update).not.toHaveBeenCalled();
  });

  it('keeps a replay a moderator hid private, so the uploader cannot undo the moderation', async () => {
    const { service, prisma } = createService();

    prisma.replay.findFirst.mockResolvedValue(mock<Replay>({ storageKey: 'replays/r1.mtreplay', timelineKey: null, hiddenAt: new Date() }));

    await expect(service.updateVisibility({ id: 'r1', userId: 'owner', visibility: 'public' })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.replay.update).not.toHaveBeenCalled();
  });
});
