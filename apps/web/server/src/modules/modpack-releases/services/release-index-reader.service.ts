import type { ModpackReleaseIndex } from '@otmetki/schemas';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';

import type { CachedReleaseIndex } from './release-index-reader.types';

import { errorMessage, isMissingFileError } from '../../../common/lib';
import { MODPACK_RELEASES_SOURCE } from '../config/modpack-releases.constants';
import { MODPACK_RELEASES_TOKENS } from '../config/tokens.constants';
import { parseReleaseIndex } from '../lib/release-index/release-index';

@Injectable()
export class ReleaseIndexReaderService {
  private readonly logger = new Logger(ReleaseIndexReaderService.name);
  private cached: CachedReleaseIndex | null = null;
  private refreshing: Promise<ModpackReleaseIndex> | null = null;
  private retryAt = 0;

  constructor(@Inject(MODPACK_RELEASES_TOKENS.indexPath) private readonly indexPath: string) {}

  async load(): Promise<ModpackReleaseIndex> {
    const now = Date.now();

    if (!this.cached) {
      return this.refresh();
    }

    const stale = now - this.cached.loadedAt >= MODPACK_RELEASES_SOURCE.cacheTtlMs;

    if (stale && now >= this.retryAt) {
      this.refresh().catch(() => undefined);
    }

    return this.cached.index;
  }

  private refresh(): Promise<ModpackReleaseIndex> {
    this.refreshing ??= this.readIndex().finally(() => {
      this.refreshing = null;
    });

    return this.refreshing;
  }

  private async readIndex(): Promise<ModpackReleaseIndex> {
    try {
      const index = parseReleaseIndex(await this.read());

      this.cached = { index, loadedAt: Date.now() };

      return index;
    } catch (error) {
      this.retryAt = Date.now() + MODPACK_RELEASES_SOURCE.retryDelayMs;
      this.logger.warn(`Release index refresh failed${this.cached ? ', serving the cached one' : ''}: ${errorMessage(error)}`);

      throw error;
    }
  }

  private read(): Promise<string> {
    return readFile(this.indexPath, 'utf8').catch((error: unknown) => {
      if (isMissingFileError(error)) {
        return '';
      }

      throw error;
    });
  }
}
