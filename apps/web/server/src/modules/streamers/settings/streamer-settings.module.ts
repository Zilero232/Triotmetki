import { Module } from '@nestjs/common';

import { StreamerProfilesModule } from '../profiles';
import { SettingsAggregateService } from './services/settings-aggregate.service';
import { SettingsShareService } from './services/settings-share.service';
import { StreamerSettingsService } from './services/streamer-settings.service';

@Module({
  imports: [StreamerProfilesModule],
  providers: [StreamerSettingsService, SettingsAggregateService, SettingsShareService],
  exports: [StreamerSettingsService, SettingsAggregateService, SettingsShareService]
})
export class StreamerSettingsModule {}
