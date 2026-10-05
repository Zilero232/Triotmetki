import type { TankTraits } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { CatalogEntry } from '../../reference';
import type { FilterByTraitsInput, TraitsEntry } from '../tanks.types';

import { VehicleCatalogService } from '../../reference';
import { matchesTraits } from '../lib';
import { TankDifficultyService } from './tank-difficulty.service';

@Injectable()
export class TankTraitsReaderService {
  constructor(
    private readonly catalog: VehicleCatalogService,
    private readonly difficulty: TankDifficultyService
  ) {}

  async all(): Promise<Map<number, TraitsEntry>> {
    const entries = await this.catalog.all();

    return new Map(
      [...entries.values()].map((entry) => [
        entry.summary.tankId,
        { spec: entry.spec, hasOffers: entry.hasOffers, traits: { status: entry.summary.status, role: entry.role } }
      ])
    );
  }

  async of(tankId: number): Promise<TraitsEntry | null> {
    const entries = await this.all();

    return entries.get(tankId) ?? null;
  }

  async traits(tankId: number): Promise<TankTraits> {
    const entry = await this.of(tankId);

    return entry?.traits ?? { status: 'researchable', role: null };
  }

  async filter({ entries, filter }: FilterByTraitsInput): Promise<CatalogEntry[]> {
    const byDifficulty = filter.difficulties?.length ? await this.difficulty.matching(filter.difficulties) : null;
    const withDifficulty = byDifficulty ? entries.filter((entry) => byDifficulty.has(entry.summary.tankId)) : [...entries];

    return withDifficulty.filter((entry) => matchesTraits({ traits: { status: entry.summary.status, role: entry.role }, filter }));
  }
}
