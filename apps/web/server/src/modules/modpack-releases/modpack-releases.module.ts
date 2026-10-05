import { Module } from '@nestjs/common';

import { ModpackReleasesController } from './modpack-releases.controller';
import { releaseIndexPathProvider } from './providers/release-index-path.provider';
import { DownloadFilesReaderService } from './services/download-files-reader.service';
import { ModpackReleasesReaderService } from './services/modpack-releases-reader.service';
import { ReleaseIndexReaderService } from './services/release-index-reader.service';

@Module({
  controllers: [ModpackReleasesController],
  providers: [releaseIndexPathProvider, ReleaseIndexReaderService, DownloadFilesReaderService, ModpackReleasesReaderService]
})
export class ModpackReleasesModule {}
