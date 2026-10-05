import { Module } from '@nestjs/common';

import { TokenCipherModule } from '../../../core';
import { DonationAlertsSdkService } from './services/donation-alerts-sdk.service';
import { IntegrationStoreService } from './services/integration-store.service';
import { IntegrationsService } from './services/integrations.service';
import { OAuthStateService } from './services/oauth-state.service';
import { TwitchSdkService } from './services/twitch-sdk.service';

@Module({
  imports: [TokenCipherModule],
  providers: [IntegrationStoreService, OAuthStateService, IntegrationsService, TwitchSdkService, DonationAlertsSdkService],
  exports: [IntegrationStoreService, IntegrationsService, TwitchSdkService, DonationAlertsSdkService]
})
export class StreamerIntegrationsModule {}
