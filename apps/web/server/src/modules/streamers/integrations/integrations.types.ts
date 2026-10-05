import type { streamerIntegrationSchema, UpdatePredictionsInput } from '@otmetki/schemas';
import type { z } from 'zod';

import type { StreamerProvider } from '../../../../generated';

export type StreamerIntegrationView = z.infer<typeof streamerIntegrationSchema>;

export type OAuthStateInput = {
  provider: StreamerProvider;
  userId: string;
};

export type IssuedOAuthState = {
  state: string;
  binding: string;
};

export type ConsumeOAuthStateInput = {
  state: string;
  binding: string | null;
};

export type ConnectUrl = {
  url: string;
  binding: string;
};

type OAuthCallbackInput = {
  code: string;
  state: string;
  binding: string | null;
  viewerId: string | null;
};

export type ProviderCallbackInput = OAuthCallbackInput & {
  provider: StreamerProvider;
};

export type OAuthCodeInput = {
  userId: string;
  code: string;
};

export type SaveIntegrationInput = {
  userId: string;
  provider: StreamerProvider;
  externalId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  config: Record<string, string> | null;
};

type StoredToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
};

export type StoreTokenInput = StoredToken & {
  provider: StreamerProvider;
  externalId: string;
};

export type SetPredictionsInput = UpdatePredictionsInput & {
  userId: string;
};

export type AppApiClientInput = {
  clientId: string;
  clientSecret: string;
};
