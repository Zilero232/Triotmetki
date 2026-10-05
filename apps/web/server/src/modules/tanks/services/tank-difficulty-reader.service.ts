import type { LearningDifficulty } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { groupBy } from 'remeda';

import { PrismaService } from '../../../core';
import { TANK_LEARNING } from '../config/tank-traits.constants';
import { toTankLearning } from '../mappers/tank-learning.mappers';

@Injectable()
export class TankDifficultyReaderService {
  private readonly cache = new LRUCache<string, Map<number, LearningDifficulty>>({
    max: 1,
    ttl: TANK_LEARNING.difficultyCacheTtlMs,
    fetchMethod: () => this.load()
  });

  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<Map<number, LearningDifficulty>> {
    return (await this.cache.fetch(TANK_LEARNING.difficultyCacheKey)) ?? new Map();
  }

  async matching(difficulties: readonly LearningDifficulty[]): Promise<Set<number>> {
    const all = await this.all();

    return new Set([...all.entries()].flatMap(([tankId, difficulty]) => (difficulties.includes(difficulty) ? [tankId] : [])));
  }

  private async load(): Promise<Map<number, LearningDifficulty>> {
    const rows = await this.prisma.tankLearningCurve.findMany();

    return new Map(
      Object.entries(groupBy(rows, (row) => row.tankId)).flatMap(([tankId, tankRows]) => {
        const difficulty = toTankLearning({ tankId: Number(tankId), rows: tankRows }).difficulty;

        return difficulty ? [[Number(tankId), difficulty] as const] : [];
      })
    );
  }
}
