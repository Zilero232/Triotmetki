import { Inject, Injectable, Logger } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import type { LestaClients } from '../../../core';

import { errorMessage } from '../../../common/lib';
import { LESTA_CLIENTS } from '../../../core';
import { LestaNotConfiguredError } from '../../../lib/lesta';
import { OFFICIAL_RATING_TYPES } from '../config/official-ratings.constants';

@Injectable()
export class OfficialRatingTypesReaderService {
  private readonly logger = new Logger(OfficialRatingTypesReaderService.name);

  private readonly cache = new LRUCache<string, string[]>({
    max: 1,
    ttl: OFFICIAL_RATING_TYPES.ttlMs,
    fetchMethod: () => this.load()
  });

  constructor(@Inject(LESTA_CLIENTS) private readonly clients: LestaClients) {}

  async lestaTypes(): Promise<string[]> {
    return (await this.cache.fetch(OFFICIAL_RATING_TYPES.key)) ?? [];
  }

  private async load(): Promise<string[] | undefined> {
    try {
      return Object.keys(await this.clients.priority.ratings.typeList());
    } catch (error) {
      if (!(error instanceof LestaNotConfiguredError)) {
        this.logger.warn(`Lesta rating types unavailable: ${errorMessage(error)}`);
      }

      return undefined;
    }
  }
}
