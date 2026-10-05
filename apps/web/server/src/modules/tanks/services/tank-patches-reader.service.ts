import type { TankPatches } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { sortBy } from 'remeda';

import { PrismaService } from '../../../core';
import { patchVerdict, readSpecChanges } from '../lib/spec-patches/spec-patches';
import { toPatchChanges } from '../mappers/tank-patches.mappers';

@Injectable()
export class TankPatchesReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async patches(tankId: number): Promise<TankPatches> {
    const rows = await this.prisma.vehicleSpecHistory.findMany({
      where: { tankId },
      include: { gameVersion: { select: { version: true, title: true, releasedAt: true, detectedAt: true, isTest: true } } }
    });

    const released = sortBy(
      rows.filter((row) => !row.gameVersion.isTest),
      (row) => (row.gameVersion.releasedAt ?? row.gameVersion.detectedAt).getTime()
    );

    const patches = released.map((row, index) => {
      const diff = readSpecChanges(row.diff);
      const changes = toPatchChanges(diff ?? []);

      return {
        version: row.gameVersion.version,
        title: row.gameVersion.title,
        date: (row.gameVersion.releasedAt ?? row.gameVersion.detectedAt).toISOString(),
        verdict: patchVerdict({ changes, isFirst: index === 0 && diff === null }),
        changes
      };
    });

    return { tankId, patches: patches.reverse() };
  }
}
