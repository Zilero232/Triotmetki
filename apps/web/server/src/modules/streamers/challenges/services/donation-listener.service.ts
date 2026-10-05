import type { RefreshingAuthProvider } from '@donation-alerts/auth';
import type { EventsClient, EventsListener } from '@donation-alerts/events';
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

import { getTokenExpiryDate } from '@donation-alerts/auth';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { differenceInSeconds } from 'date-fns';

import type { StreamerIntegration } from '../../../../../generated';
import type { DonationConnection, DonationEventInput } from '../challenges.types';

import { errorMessage } from '../../../../common/lib';
import { AppConfigService } from '../../../../config';
import { CHAT_COPY, ChatAnnouncerService, ChatReplyReaderService } from '../../chat';
import { DONATION_ALERTS, DonationAlertsSdkService, INTEGRATIONS, IntegrationWriterService } from '../../integrations';
import { OverlayPublisherService } from '../../overlays';
import { ChallengeWriterService } from './challenge-writer.service';

@Injectable()
export class DonationListenerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DonationListenerService.name);
  private readonly connections = new Map<number, DonationConnection>();
  private auth: RefreshingAuthProvider | null = null;
  private events: EventsClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly store: IntegrationWriterService,
    private readonly challenges: ChallengeWriterService,
    private readonly announcer: ChatAnnouncerService,
    private readonly publisher: OverlayPublisherService,
    private readonly stats: ChatReplyReaderService,
    private readonly sdk: DonationAlertsSdkService
  ) {}

  onApplicationBootstrap(): void {
    const clientId = this.config.get('DONATIONALERTS_CLIENT_ID');
    const clientSecret = this.config.get('DONATIONALERTS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.log('DonationAlerts listener is disabled: DONATIONALERTS_CLIENT_ID is empty');

      return;
    }

    if (this.config.get('NODE_ENV') === 'test') {
      return;
    }

    this.auth = this.sdk.createAuthProvider({ clientId, clientSecret, scopes: [...DONATION_ALERTS.scopes] });

    this.auth.onRefresh((externalId, token) => {
      void this.store
        .storeToken({
          provider: 'donationAlerts',
          externalId: String(externalId),
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: getTokenExpiryDate(token)
        })
        .catch((error: unknown) => {
          this.logger.warn(`DonationAlerts token of ${externalId} was not stored: ${errorMessage(error)}`);
        });
    });

    this.events = this.sdk.createEventsClient(this.auth);

    void this.sync();
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.connections.values()].map(({ listener }) => listener.remove()));
    this.connections.clear();
  }

  @Interval(INTEGRATIONS.syncIntervalMs)
  async sync(): Promise<void> {
    if (!this.auth) {
      return;
    }

    try {
      const integrations = await this.store.byProvider('donationAlerts');
      const active = new Set(integrations.map((integration) => Number(integration.externalId)));

      for (const integration of integrations) {
        if (!this.connections.has(Number(integration.externalId))) {
          await this.connect(integration);
        }
      }

      for (const [externalId, { listener }] of this.connections) {
        if (!active.has(externalId)) {
          await listener.remove();
          await this.events?.removeUser(externalId);
          this.auth?.removeUser(externalId);
          this.connections.delete(externalId);
        }
      }
    } catch (error) {
      this.logger.warn(`DonationAlerts sync failed: ${errorMessage(error)}`);
    }
  }

  private async connect(integration: StreamerIntegration): Promise<void> {
    if (!this.auth || !this.events || !integration.accessToken || !integration.refreshToken) {
      return;
    }

    const externalId = Number(integration.externalId);
    const now = new Date();
    const expiresIn = integration.tokenExpiresAt ? Math.max(0, differenceInSeconds(integration.tokenExpiresAt, now)) : 0;

    this.auth.addUser(externalId, {
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken,
      expiresIn,
      obtainmentTimestamp: now.getTime(),
      scopes: [...DONATION_ALERTS.scopes]
    });

    const listener: EventsListener = await this.events.onDonation(externalId, (donation) => {
      void this.onDonation({ streamerUserId: integration.userId, donation });
    });

    this.connections.set(externalId, { userId: integration.userId, listener });
  }

  private async onDonation({ streamerUserId, donation }: DonationEventInput): Promise<void> {
    try {
      const challenge = await this.challenges.handleDonation({
        streamerUserId,
        externalId: String(donation.id),
        donorName: donation.username,
        message: donation.message,
        amount: donation.amount,
        currency: donation.currency
      });

      if (!challenge) {
        return;
      }

      const text = await this.stats.text({
        streamerUserId,
        message: CHAT_COPY.messages.challengeActive,
        values: { title: challenge.title, donor: challenge.donorName ?? donation.username }
      });

      await Promise.all([this.announcer.announce({ streamerUserId, text }), this.publisher.publish(challenge.accountId)]);
    } catch (error) {
      this.logger.warn(`donation ${donation.id} was not processed: ${errorMessage(error)}`);
    }
  }
}
