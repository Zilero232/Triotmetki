import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { GameVersion } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { GameVersionReaderService } from '../game-version-reader.service';

describe('GameVersionReaderService.current', () => {
  it('answers all-null fields when no version is known', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.gameVersion.findFirst.mockResolvedValue(null);

    await expect(new GameVersionReaderService(prisma).current()).resolves.toEqual({ version: null, title: null, releasedAt: null, notesUrl: null });
  });

  it('serialises the release date of the current version', async () => {
    const prisma = mockDeep<PrismaService>();
    const releasedAt = new Date('2026-09-01T06:00:00.000Z');

    prisma.gameVersion.findFirst.mockResolvedValue(mock<GameVersion>({ version: '1.31', title: null, releasedAt, notesUrl: null }));

    await expect(new GameVersionReaderService(prisma).current()).resolves.toEqual({
      version: '1.31',
      title: null,
      releasedAt: releasedAt.toISOString(),
      notesUrl: null
    });
  });
});
