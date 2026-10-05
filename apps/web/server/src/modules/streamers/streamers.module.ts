import { Module } from '@nestjs/common';

import { HttpModule, TokenCipherModule } from '../../core';
import { BillingCoreModule } from '../billing';
import { BotCommandsModule } from '../bot-commands';
import { ModModule } from '../mod';
import { ProgressionCoreModule } from '../progression';
import { AdminStreamersController } from './admin-streamers.controller';
import { ModSettingsController } from './mod-settings.controller';
import { OverlaysController } from './overlays.controller';
import {
  ChallengeService,
  DonationAlertsSdkService,
  FeedReaderService,
  IntegrationsService,
  IntegrationStoreService,
  LivePlatformsService,
  OAuthStateService,
  OverlayDataService,
  OverlayPublisherService,
  OverlayService,
  OverlayStreamService,
  SettingsAggregateService,
  SettingsShareService,
  StreamerCardsService,
  StreamerClaimService,
  StreamerDirectoryService,
  StreamerFollowService,
  StreamerInvitationService,
  StreamerModerationService,
  StreamerProfileService,
  StreamerSettingsService,
  TwitchPanelService,
  TwitchSdkService
} from './services';
import { StreamersController } from './streamers.controller';

@Module({
  imports: [HttpModule, TokenCipherModule, BillingCoreModule, BotCommandsModule, ProgressionCoreModule, ModModule],
  controllers: [OverlaysController, StreamersController, AdminStreamersController, ModSettingsController],
  providers: [
    StreamerProfileService,
    StreamerCardsService,
    StreamerDirectoryService,
    StreamerClaimService,
    StreamerInvitationService,
    StreamerModerationService,
    StreamerSettingsService,
    StreamerFollowService,
    TwitchPanelService,
    SettingsAggregateService,
    SettingsShareService,
    LivePlatformsService,
    OverlayService,
    OverlayDataService,
    OverlayPublisherService,
    OverlayStreamService,
    ChallengeService,
    IntegrationStoreService,
    IntegrationsService,
    OAuthStateService,
    TwitchSdkService,
    DonationAlertsSdkService,
    FeedReaderService
  ]
})
export class StreamersModule {}
