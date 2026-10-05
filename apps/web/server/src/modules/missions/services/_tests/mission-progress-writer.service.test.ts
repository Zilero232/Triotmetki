import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Mission } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { MissionProgressWriterService } from '../mission-progress-writer.service';

const updatedAt = new Date('2026-09-26T10:00:00Z');

const setup = () => {
  const prisma = mockDeep<PrismaService>();

  return { prisma, service: new MissionProgressWriterService(prisma) };
};

describe('MissionProgressWriterService.update', () => {
  it('marks a mission done when it is completed with honors', async () => {
    const { prisma, service } = setup();

    prisma.mission.findFirst.mockResolvedValue(mock<Mission>({ questId: 5 }));
    prisma.userMissionProgress.upsert.mockResolvedValue({ userId: 'u', questId: 5, done: true, honors: true, source: 'manual', updatedAt });

    const item = await service.update({ userId: 'u', questId: 5, done: false, honors: true });

    expect(prisma.userMissionProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: 'u', questId: 5, done: true, honors: true, source: 'manual' } })
    );

    expect(item).toEqual({ questId: 5, done: true, honors: true, source: 'manual', updatedAt: updatedAt.toISOString() });
  });

  it('clears a mission that is unmarked', async () => {
    const { prisma, service } = setup();

    prisma.mission.findFirst.mockResolvedValue(mock<Mission>({ questId: 5 }));
    prisma.userMissionProgress.upsert.mockResolvedValue({ userId: 'u', questId: 5, done: false, honors: false, source: 'manual', updatedAt });

    const item = await service.update({ userId: 'u', questId: 5, done: false, honors: false });

    expect(prisma.userMissionProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { done: false, honors: false, source: 'manual' } })
    );

    expect(item).toMatchObject({ done: false, honors: false });
  });

  it('refuses a mission the game data does not know', async () => {
    const { prisma, service } = setup();

    prisma.mission.findFirst.mockResolvedValue(null);

    await expect(service.update({ userId: 'u', questId: 999, done: true, honors: false })).rejects.toMatchObject({
      status: 404,
      response: { code: 'NOT_FOUND' }
    });

    expect(prisma.userMissionProgress.upsert).not.toHaveBeenCalled();
  });
});
