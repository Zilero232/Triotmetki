import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import type { RefreshingAuthProvider } from '@twurple/auth';

import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { addSeconds, differenceInSeconds } from 'date-fns';

import type { StreamerIntegration } from '../../../../../generated';
import type { ChallengeAnnouncement, ChatAnnouncer, ChatMessageInput, TwitchConnection } from '../chat.types';

import { errorMessage, readRecord } from '../../../../common/lib';
import { AppConfigService } from '../../../../config';
import { INTEGRATIONS, IntegrationStoreService, TWITCH, TwitchSdkService } from '../../integrations';
import { parseChatCommand } from '../lib/chat-command';
import { StreamerStatsService } from './streamer-stats.service';

@Injectable()
export class TwitchChatService implements ChatAnnouncer, OnApplicationBootstrap, OnModuleDestroy {
  readonly provider = 'twitch';
  private readonly logger = new Logger(TwitchChatService.name);
  private readonly connections = new Map<string, TwitchConnection>();
  private auth: RefreshingAuthProvider | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly store: IntegrationStoreService,
    private readonly stats: StreamerStatsService,
    private readonly sdk: TwitchSdkService
  ) {}

  get authProvider(): RefreshingAuthProvider | null {
    return this.auth;
  }

  onApplicationBootstrap(): void {
    const clientId = this.config.get('TWITCH_CLIENT_ID');
    const clientSecret = this.config.get('TWITCH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.log('twitch chat is disabled: TWITCH_CLIENT_ID is empty');

      return;
    }

    if (this.config.get('NODE_ENV') === 'test') {
      return;
    }

    this.auth = this.sdk.createAuthProvider({ clientId, clientSecret });

    this.auth.onRefresh((externalId, token) => {
      void this.store
        .storeToken({
          provider: 'twitch',
          externalId,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresIn === null ? null : addSeconds(token.obtainmentTimestamp, token.expiresIn)
        })
        .catch((error: unknown) => {
          this.logger.warn(`twitch token of ${externalId} was not stored: ${errorMessage(error)}`);
        });
    });

    void this.sync();
  }

  onModuleDestroy(): void {
    for (const { client } of this.connections.values()) {
      client.quit();
    }

    this.connections.clear();
  }

  async announce({ streamerUserId, text }: ChallengeAnnouncement): Promise<void> {
    const connection = this.connections.get(streamerUserId);

    if (connection) {
      await connection.client.say(connection.login, text);
    }
  }

  @Interval(INTEGRATIONS.syncIntervalMs)
  async sync(): Promise<void> {
    if (!this.auth) {
      return;
    }

    try {
      const integrations = await this.store.byProvider('twitch');
      const active = new Set(integrations.map((integration) => integration.userId));

      for (const integration of integrations) {
        if (!this.connections.has(integration.userId)) {
          this.connect(integration);
        }
      }

      for (const [userId, { client, externalId }] of this.connections) {
        if (!active.has(userId)) {
          client.quit();
          this.auth?.removeUser(externalId);
          this.connections.delete(userId);
        }
      }
    } catch (error) {
      this.logger.warn(`twitch chat sync failed: ${errorMessage(error)}`);
    }
  }

  private connect(integration: StreamerIntegration): void {
    const login = readRecord(integration.config).login;

    if (!this.auth || typeof login !== 'string' || !integration.accessToken) {
      return;
    }

    const intent = `${TWITCH.intentPrefix}${integration.externalId}`;
    const now = new Date();
    const expiresIn = integration.tokenExpiresAt ? Math.max(0, differenceInSeconds(integration.tokenExpiresAt, now)) : null;

    this.auth.addUser(
      integration.externalId,
      { accessToken: integration.accessToken, refreshToken: integration.refreshToken, expiresIn, obtainmentTimestamp: now.getTime() },
      [intent]
    );

    const client = this.sdk.createChatClient({ authProvider: this.auth, channels: [login], authIntents: [intent] });

    client.onMessage((channel, _user, text) => {
      void this.reply({ userId: integration.userId, client, channel, text });
    });

    client.connect();
    this.connections.set(integration.userId, { client, login, externalId: integration.externalId });
  }

  private async reply({ userId, client, channel, text }: ChatMessageInput): Promise<void> {
    const command = parseChatCommand(text);

    if (!command) {
      return;
    }

    try {
      const answer = await this.stats.reply({ streamerUserId: userId, command });

      if (answer) {
        await client.say(channel, answer);
      }
    } catch (error) {
      this.logger.warn(`twitch !${command} failed: ${errorMessage(error)}`);
    }
  }
}
