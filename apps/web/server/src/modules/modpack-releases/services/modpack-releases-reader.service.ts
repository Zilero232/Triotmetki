import type {
  ModpackChangelog,
  ModpackLatestRelease,
  ModpackManagerUpdate,
  ModpackManagerUpdateQuery,
  ModpackReleasesStatus
} from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { selectManagerUpdate } from '../lib/manager-update/manager-update';
import { modpackChangelog } from '../lib/release-changes/release-changes';
import { releaseStatus } from '../lib/release-status/release-status';
import { selectRelease } from '../lib/select-release/select-release';
import { DownloadFilesReaderService } from './download-files-reader.service';
import { ReleaseIndexReaderService } from './release-index-reader.service';

@Injectable()
export class ModpackReleasesReaderService {
  constructor(
    private readonly index: ReleaseIndexReaderService,
    private readonly files: DownloadFilesReaderService
  ) {}

  async latest(game: string): Promise<ModpackLatestRelease> {
    return selectRelease({ index: await this.index.load(), game });
  }

  async status(): Promise<ModpackReleasesStatus> {
    const [index, sizes] = await Promise.all([this.index.load(), this.files.sizes()]);

    return releaseStatus({ index, sizes });
  }

  async changelog(limit: number): Promise<ModpackChangelog> {
    return modpackChangelog({ index: await this.index.load(), limit });
  }

  async managerUpdate(query: ModpackManagerUpdateQuery): Promise<ModpackManagerUpdate | null> {
    return selectManagerUpdate({ index: await this.index.load(), query });
  }
}
