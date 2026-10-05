import { Inject, Injectable } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { DownloadSizes } from '../lib/release-status/release-status.types';

import { MODPACK_RELEASES_SOURCE } from '../config/modpack-releases.constants';
import { MODPACK_RELEASES_TOKENS } from '../config/tokens.constants';

@Injectable()
export class DownloadFilesReaderService {
  constructor(@Inject(MODPACK_RELEASES_TOKENS.indexPath) private readonly indexPath: string) {}

  async sizes(): Promise<DownloadSizes> {
    const [modpack, manager] = await Promise.all([
      this.size(MODPACK_RELEASES_SOURCE.files.modpack),
      this.size(MODPACK_RELEASES_SOURCE.files.manager)
    ]);

    return { modpack, manager };
  }

  private async size(file: string): Promise<number | null> {
    const stats = await stat(join(dirname(this.indexPath), file)).catch(() => null);

    return stats?.isFile() ? stats.size : null;
  }
}
