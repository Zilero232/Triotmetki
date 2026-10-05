import { Module } from '@nestjs/common';

import { StreamerProfilesModule } from '../profiles';
import { SettingsAggregateService } from './services/settings-aggregate.service';
import { SettingsShareWriterService } from './services/settings-share-writer.service';
import { StreamerSettingsReaderService } from './services/streamer-settings-reader.service';
import { StreamerSettingsWriterService } from './services/streamer-settings-writer.service';

@Module({
  imports: [StreamerProfilesModule],
  providers: [StreamerSettingsReaderService, StreamerSettingsWriterService, SettingsAggregateService, SettingsShareWriterService],
  exports: [StreamerSettingsReaderService, StreamerSettingsWriterService, SettingsAggregateService, SettingsShareWriterService]
})
export class StreamerSettingsModule {}
