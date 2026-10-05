import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { LestaClients } from '../../../../core';
import type { EncyclopediaPayload } from '../../contracts';
import type { SectionRunner, VersionCheckResult } from '../reference.types';

import { errorMessage } from '../../../../common/lib';
import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { COLLECTOR_STATE_KEY } from '../../config';
import { JOB, QUEUE } from '../../contracts';
import { REFERENCE } from '../config/reference.constants';
import { CatalogSyncService } from './catalog-sync.service';
import { EquipmentSyncService } from './equipment-sync.service';
import { VehicleSyncService } from './vehicle-sync.service';

@Injectable()
export class EncyclopediaSyncService {
  private readonly logger = new Logger(EncyclopediaSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    @InjectQueue(QUEUE.reference) private readonly queue: Queue,
    private readonly vehicles: VehicleSyncService,
    private readonly equipment: EquipmentSyncService,
    private readonly catalog: CatalogSyncService
  ) {}

  async checkVersion(): Promise<VersionCheckResult> {
    const info = await this.clients.priority.encyclopedia.info();
    const current = await this.prisma.gameVersion.findFirst({ where: { isCurrent: true, source: REFERENCE.gameSource }, select: { version: true } });
    const changed = current?.version !== info.game_version;

    if (changed) {
      await this.queue.add(JOB.reference.encyclopedia, { force: true } satisfies EncyclopediaPayload, {
        deduplication: { id: `encyclopedia:${info.game_version}` }
      });
    }

    return { version: info.game_version, changed };
  }

  async sync({ force }: EncyclopediaPayload) {
    const info = await this.clients.priority.encyclopedia.info();
    const previous = await this.prisma.gameVersion.findFirst({ where: { isCurrent: true, source: REFERENCE.gameSource } });

    if (!force && previous?.version === info.game_version) {
      return { version: info.game_version, skipped: true };
    }

    const version = await this.prisma.gameVersion.upsert({
      where: { source_version: { source: REFERENCE.gameSource, version: info.game_version } },
      create: { source: REFERENCE.gameSource, version: info.game_version },
      update: {}
    });

    const sections: [string, SectionRunner][] = [
      ['vehicles', () => this.vehicles.sync(version.id)],
      ['modules', () => this.equipment.modules()],
      ['provisions', () => this.equipment.provisions()],
      ['crew', () => this.equipment.crew()],
      ['arenas', () => this.catalog.arenas()],
      ['achievements', () => this.catalog.achievements()]
    ];

    const counts: Record<string, number> = {};
    const failed: string[] = [];

    for (const [name, run] of sections) {
      try {
        counts[name] = await run();
      } catch (error) {
        this.logger.error(`encyclopedia ${name} failed: ${errorMessage(error)}`);
        failed.push(name);
      }
    }

    if (failed.length > 0) {
      throw new Error(`encyclopedia ${info.game_version} incomplete, failed sections: ${failed.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.gameVersion.updateMany({
        where: { isCurrent: true, source: REFERENCE.gameSource, NOT: { id: version.id } },
        data: { isCurrent: false }
      }),
      this.prisma.gameVersion.update({ where: { id: version.id }, data: { isCurrent: true } })
    ]);

    const value = { version: info.game_version, tanksUpdatedAt: info.tanks_updated_at, syncedAt: new Date().toISOString() };

    await this.prisma.collectorState.upsert({
      where: { key: COLLECTOR_STATE_KEY.gameVersion },
      create: { key: COLLECTOR_STATE_KEY.gameVersion, value },
      update: { value }
    });

    return { version: info.game_version, counts };
  }
}
