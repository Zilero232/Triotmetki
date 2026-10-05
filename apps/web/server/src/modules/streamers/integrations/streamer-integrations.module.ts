import { Module } from '@nestjs/common';

import { TokenCipherModule } from '../../../core';
import { DonationAlertsSdkService } from './services/donation-alerts-sdk.service';
import { IntegrationConnectWriterService } from './services/integration-connect-writer.service';
import { IntegrationWriterService } from './services/integration-writer.service';
import { OAuthStateService } from './services/oauth-state.service';
import { TwitchSdkService } from './services/twitch-sdk.service';

@Module({
  imports: [TokenCipherModule],
  providers: [IntegrationWriterService, OAuthStateService, IntegrationConnectWriterService, TwitchSdkService, DonationAlertsSdkService],
  exports: [IntegrationWriterService, IntegrationConnectWriterService, TwitchSdkService, DonationAlertsSdkService]
})
export class StreamerIntegrationsModule {}
