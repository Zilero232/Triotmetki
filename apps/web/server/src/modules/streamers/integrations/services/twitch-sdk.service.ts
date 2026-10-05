import type { RefreshingAuthProviderConfig } from '@twurple/auth';
import type { ChatClientOptions } from '@twurple/chat';

import { Injectable } from '@nestjs/common';
import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider, exchangeCode, getTokenInfo, RefreshingAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';

import type { AppApiClientInput } from '../integrations.types';

@Injectable()
export class TwitchSdkService {
  readonly exchangeCode = exchangeCode;
  readonly getTokenInfo = getTokenInfo;

  createAuthProvider(config: RefreshingAuthProviderConfig): RefreshingAuthProvider {
    return new RefreshingAuthProvider(config);
  }

  createChatClient(options: ChatClientOptions): ChatClient {
    return new ChatClient(options);
  }

  createApiClient(authProvider: RefreshingAuthProvider): ApiClient {
    return new ApiClient({ authProvider });
  }

  createAppApiClient({ clientId, clientSecret }: AppApiClientInput): ApiClient {
    return new ApiClient({ authProvider: new AppTokenAuthProvider(clientId, clientSecret) });
  }
}
