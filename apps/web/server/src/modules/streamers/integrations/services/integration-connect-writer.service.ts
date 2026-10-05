import type { CookieOptions } from 'express';

import { Injectable, Logger } from '@nestjs/common';
import { addSeconds, secondsToMilliseconds } from 'date-fns';
import { match } from 'ts-pattern';

import type { StreamerProvider } from '../../../../../generated';
import type { ConnectUrl, OAuthCodeInput, OAuthStateInput, ProviderCallbackInput } from '../integrations.types';

import { AppBadRequestException, AppNotFoundException } from '../../../../common/exceptions';
import { errorMessage } from '../../../../common/lib';
import { AppConfigService } from '../../../../config';
import { DONATION_ALERTS, INTEGRATIONS, NO_SCOPES, OAUTH_STATE, TWITCH } from '../config/integrations.constants';
import { DonationAlertsSdkService } from './donation-alerts-sdk.service';
import { IntegrationWriterService } from './integration-writer.service';
import { OAuthStateService } from './oauth-state.service';
import { TwitchSdkService } from './twitch-sdk.service';

@Injectable()
export class IntegrationConnectWriterService {
  private readonly logger = new Logger(IntegrationConnectWriterService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly states: OAuthStateService,
    private readonly store: IntegrationWriterService,
    private readonly twitch: TwitchSdkService,
    private readonly donationAlerts: DonationAlertsSdkService
  ) {}

  async connectUrl({ userId, provider }: OAuthStateInput): Promise<ConnectUrl> {
    const { clientId, clientSecret, authorizeUrl, scopes } = this.app(provider);

    if (!authorizeUrl) {
      throw new AppBadRequestException('VALIDATION_FAILED', `${provider} cannot be connected`);
    }

    if (!clientId || !clientSecret) {
      throw new AppNotFoundException('INTEGRATION_UNAVAILABLE', `${provider} is not configured on this server`);
    }

    const { state, binding } = await this.states.create({ provider, userId });
    const url = new URL(authorizeUrl);

    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', this.redirectUri(provider));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);

    return { url: url.href, binding };
  }

  async callback({ provider, code, state, binding, viewerId }: ProviderCallbackInput): Promise<string> {
    const webUrl = this.config.get('WEB_URL');
    const owner = await this.states.consume({ state, binding });

    if (owner?.provider !== provider || (viewerId !== null && viewerId !== owner.userId)) {
      return new URL(INTEGRATIONS.failedRedirectPath, webUrl).href;
    }

    try {
      await match(provider)
        .with('donationAlerts', () => this.connectDonationAlerts({ userId: owner.userId, code }))
        .with('twitch', () => this.connectTwitch({ userId: owner.userId, code }))
        .otherwise(() => {
          throw new AppBadRequestException('VALIDATION_FAILED', `${provider} cannot be connected`);
        });

      return new URL(INTEGRATIONS.doneRedirectPath, webUrl).href;
    } catch (error) {
      this.logger.warn(`${provider} connect failed for ${owner.userId}: ${errorMessage(error)}`);

      return new URL(INTEGRATIONS.failedRedirectPath, webUrl).href;
    }
  }

  bindingCookie(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('API_URL').startsWith('https://'),
      path: OAUTH_STATE.cookiePath,
      maxAge: secondsToMilliseconds(OAUTH_STATE.ttlSeconds)
    };
  }

  private async connectDonationAlerts({ userId, code }: OAuthCodeInput): Promise<void> {
    const clientId = this.config.get('DONATIONALERTS_CLIENT_ID');
    const clientSecret = this.config.get('DONATIONALERTS_CLIENT_SECRET');
    const token = await this.donationAlerts.getAccessToken(clientId, clientSecret, this.redirectUri('donationAlerts'), code);
    const provider = this.donationAlerts.createAuthProvider({ clientId, clientSecret });
    const { userId: externalId } = await provider.addUserForToken({ ...token, scopes: [...DONATION_ALERTS.scopes] });

    await this.store.save({
      userId,
      provider: 'donationAlerts',
      externalId: String(externalId),
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: addSeconds(token.obtainmentTimestamp, token.expiresIn),
      scope: DONATION_ALERTS.scopes.join(' '),
      config: null
    });
  }

  private async connectTwitch({ userId, code }: OAuthCodeInput): Promise<void> {
    const clientId = this.config.get('TWITCH_CLIENT_ID');
    const token = await this.twitch.exchangeCode(clientId, this.config.get('TWITCH_CLIENT_SECRET'), code, this.redirectUri('twitch'));
    const info = await this.twitch.getTokenInfo(token.accessToken, clientId);

    if (!info.userId || !info.userName) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'Twitch returned a token without a user');
    }

    await this.store.save({
      userId,
      provider: 'twitch',
      externalId: info.userId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresIn === null ? null : addSeconds(token.obtainmentTimestamp, token.expiresIn),
      scope: token.scope.join(' '),
      config: { login: info.userName }
    });
  }

  private app(provider: StreamerProvider) {
    return match(provider)
      .with('donationAlerts', () => ({
        clientId: this.config.get('DONATIONALERTS_CLIENT_ID'),
        clientSecret: this.config.get('DONATIONALERTS_CLIENT_SECRET'),
        authorizeUrl: DONATION_ALERTS.authorizeUrl,
        scopes: DONATION_ALERTS.scopes
      }))
      .with('twitch', () => ({
        clientId: this.config.get('TWITCH_CLIENT_ID'),
        clientSecret: this.config.get('TWITCH_CLIENT_SECRET'),
        authorizeUrl: TWITCH.authorizeUrl,
        scopes: TWITCH.scopes
      }))
      .otherwise(() => ({ clientId: '', clientSecret: '', authorizeUrl: '', scopes: NO_SCOPES }));
  }

  private redirectUri(provider: StreamerProvider): string {
    const path = provider === 'twitch' ? TWITCH.callbackPath : DONATION_ALERTS.callbackPath;

    return new URL(path, this.config.get('API_URL')).href;
  }
}
