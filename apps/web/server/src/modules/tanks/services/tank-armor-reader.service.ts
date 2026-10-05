import type { ArmorAttackerData, ArmorModelResponse } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { bytesToBase64, listArmorGuns } from '@otmetki/gamedata';
import { armorModulesSchema } from '@otmetki/schemas';
import { LRUCache } from 'lru-cache';

import type { ArmorStorage } from '../../gamedata';
import type { OpenArmorInput } from '../tanks.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { ARMOR_VIEWER } from '../../../config';
import { PrismaService, StorageObjectMissingError } from '../../../core';
import { MODEL_SOURCES } from '../../gamedata';
import { VehicleCatalogService } from '../../reference';
import { UsageMeterService } from '../../usage';
import { ARMOR_STORAGE } from '../config';
import { TankDetailService } from './tank-detail.service';

@Injectable()
export class TankArmorReaderService {
  private readonly models = new LRUCache<number, ArmorModelResponse>({
    max: ARMOR_VIEWER.memoryCache.maxEntries,
    maxSize: ARMOR_VIEWER.memoryCache.maxBytes,
    sizeCalculation: (model) => model.geometry.length,
    ttl: ARMOR_VIEWER.memoryCache.ttlMs,
    fetchMethod: (tankId) => this.load(tankId)
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly details: TankDetailService,
    private readonly usage: UsageMeterService,
    @Inject(ARMOR_STORAGE) private readonly storage: ArmorStorage
  ) {}

  async open({ idOrSlug, actor }: OpenArmorInput): Promise<ArmorModelResponse> {
    const tankId = await this.details.resolve(idOrSlug);
    const model = await this.armor(tankId);

    await this.usage.consume({ meter: ARMOR_VIEWER.meter, actor, subject: String(tankId) });

    return model;
  }

  async guns(idOrSlug: string): Promise<ArmorAttackerData> {
    const tankId = await this.details.resolve(idOrSlug);
    const [entry, row] = await Promise.all([
      this.catalog.find(tankId),
      this.prisma.vehicleArmorModel.findUnique({ where: { tankId }, select: { modules: true } })
    ]);

    if (!entry || !row) {
      throw new AppNotFoundException('ARMOR_MODEL_NOT_FOUND', `No armor model for tank ${tankId}`);
    }

    return { vehicle: entry.summary, guns: listArmorGuns(armorModulesSchema.parse(row.modules)) };
  }

  async armor(tankId: number): Promise<ArmorModelResponse> {
    const model = await this.models.fetch(tankId);

    if (!model) {
      throw new AppNotFoundException('ARMOR_MODEL_NOT_FOUND', `No armor model for tank ${tankId}`);
    }

    return model;
  }

  private async load(tankId: number): Promise<ArmorModelResponse> {
    const [entry, row] = await Promise.all([this.catalog.find(tankId), this.prisma.vehicleArmorModel.findUnique({ where: { tankId } })]);

    if (!entry || !row) {
      throw new AppNotFoundException('ARMOR_MODEL_NOT_FOUND', `No armor model for tank ${tankId}`);
    }

    const bytes = await this.storage.get(row.storageKey).catch((error: unknown) => {
      throw error instanceof StorageObjectMissingError
        ? new AppNotFoundException('ARMOR_MODEL_NOT_FOUND', `Armor geometry ${row.storageKey} is missing from storage`)
        : error;
    });

    return {
      vehicle: entry.summary,
      gameVersion: row.gameVersion,
      hash: row.hash,
      geometry: bytesToBase64(bytes),
      modules: armorModulesSchema.parse(row.modules),
      source: { repo: ARMOR_VIEWER.sourceRepo, commit: row.sourceSha, client: MODEL_SOURCES.RU.guid }
    };
  }
}
