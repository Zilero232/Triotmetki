import type { RefreshingAuthProviderConfig } from '@donation-alerts/auth';

import { ApiClient } from '@donation-alerts/api';
import { getAccessToken, RefreshingAuthProvider } from '@donation-alerts/auth';
import { EventsClient } from '@donation-alerts/events';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DonationAlertsSdkService {
  readonly getAccessToken = getAccessToken;

  createAuthProvider(config: RefreshingAuthProviderConfig): RefreshingAuthProvider {
    return new RefreshingAuthProvider(config);
  }

  createEventsClient(authProvider: RefreshingAuthProvider): EventsClient {
    return new EventsClient({ apiClient: new ApiClient({ authProvider }) });
  }
}
