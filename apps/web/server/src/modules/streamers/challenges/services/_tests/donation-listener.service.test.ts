import type { AccessToken, RefreshingAuthProvider as DonationAlertsAuthProvider } from '@donation-alerts/auth';
import type { DonationAlertsDonationEvent, EventsClient, EventsListener } from '@donation-alerts/events';

import { getTokenExpiryDate } from '@donation-alerts/auth';
import { ConfigService } from '@nestjs/config';
import { addSeconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Challenge, StreamerIntegration } from '../../../../../../generated';
import type { Env } from '../../../../../config';
import type { ChatAnnouncerService, ChatReplyReaderService } from '../../../chat';
import type { DonationAlertsSdkService, IntegrationWriterService } from '../../../integrations';
import type { OverlayPublisherService } from '../../../overlays';
import type { ChallengeWriterService } from '../challenge-writer.service';

import { AppConfigService } from '../../../../../config';
import { CHAT_COPY } from '../../../chat';
import { DONATION_ALERTS } from '../../../integrations';
import { DonationListenerService } from '../donation-listener.service';

const sdk = {
  addUser: vi.fn<DonationAlertsAuthProvider['addUser']>(),
  removeUser: vi.fn<DonationAlertsAuthProvider['removeUser']>(),
  onRefresh: vi.fn<DonationAlertsAuthProvider['onRefresh']>(),
  onDonation: vi.fn<EventsClient['onDonation']>(),
  removeEventsUser: vi.fn<EventsClient['removeUser']>()
};

const NOW = new Date('2026-09-01T12:00:00.000Z');
const ENV = { DONATIONALERTS_CLIENT_ID: 'da-id', DONATIONALERTS_CLIENT_SECRET: 'da-secret' } satisfies Partial<Env>;

const integration = (overrides: Partial<StreamerIntegration> = {}): StreamerIntegration => ({
  id: 'int-1',
  userId: 'streamer-1',
  provider: 'donationAlerts',
  externalId: '42',
  accessToken: 'a',
  refreshToken: 'r',
  tokenExpiresAt: addSeconds(NOW, 600),
  scope: null,
  config: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides
});

const donation = mock<DonationAlertsDonationEvent>({ id: 9001, username: 'donor', message: 'CODE-1 go', amount: 500, currency: 'RUB' });

const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const createService = (env: Partial<Env> = ENV) => {
  const store = mock<IntegrationWriterService>();
  const challenges = mock<ChallengeWriterService>();
  const announcer = mock<ChatAnnouncerService>();
  const publisher = mock<OverlayPublisherService>();
  const stats = mock<ChatReplyReaderService>();
  const listener = mock<EventsListener>();
  const factory = mock<DonationAlertsSdkService>();

  store.byProvider.mockResolvedValue([]);
  store.storeToken.mockResolvedValue(undefined);
  listener.remove.mockResolvedValue();
  sdk.onDonation.mockResolvedValue(listener);
  sdk.removeEventsUser.mockResolvedValue();
  stats.text.mockResolvedValue('announcement');

  factory.createAuthProvider.mockReturnValue(
    mock<DonationAlertsAuthProvider>({ addUser: sdk.addUser, removeUser: sdk.removeUser, onRefresh: sdk.onRefresh })
  );

  factory.createEventsClient.mockReturnValue(mock<EventsClient>({ onDonation: sdk.onDonation, removeUser: sdk.removeEventsUser }));

  const service = new DonationListenerService(
    new AppConfigService(new ConfigService<Env, true>(env)),
    store,
    challenges,
    announcer,
    publisher,
    stats,
    factory
  );

  return { service, store, challenges, announcer, publisher, stats, listener, factory };
};

const boot = async (setup: ReturnType<typeof createService>, integrations: StreamerIntegration[]) => {
  setup.store.byProvider.mockResolvedValue(integrations);
  setup.service.onApplicationBootstrap();
  await flush();
};

const donationHandler = () => {
  const handler = sdk.onDonation.mock.calls[0]?.[1];

  if (!handler) {
    throw new Error('no donation handler was registered');
  }

  return handler;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.stubEnv('NODE_ENV', 'development');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('DonationListenerService.onApplicationBootstrap', () => {
  it('stays disabled without DonationAlerts credentials', async () => {
    const setup = createService({ DONATIONALERTS_CLIENT_ID: '', DONATIONALERTS_CLIENT_SECRET: '' });

    await boot(setup, [integration()]);
    await setup.service.sync();

    expect(setup.factory.createAuthProvider).not.toHaveBeenCalled();
    expect(setup.store.byProvider).not.toHaveBeenCalled();
  });

  it('stays idle in the test environment', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const setup = createService();

    await boot(setup, [integration()]);

    expect(setup.factory.createAuthProvider).not.toHaveBeenCalled();
    expect(sdk.onDonation).not.toHaveBeenCalled();
  });

  it('stores refreshed tokens against the external account', async () => {
    const setup = createService();
    const token: AccessToken = { accessToken: 'a2', refreshToken: 'r2', expiresIn: 3600, obtainmentTimestamp: NOW.getTime() };

    await boot(setup, []);
    sdk.onRefresh.mock.calls[0]?.[0](42, token);

    expect(setup.store.storeToken).toHaveBeenCalledWith({
      provider: 'donationAlerts',
      externalId: '42',
      accessToken: 'a2',
      refreshToken: 'r2',
      expiresAt: getTokenExpiryDate(token)
    });
  });
});

describe('DonationListenerService.sync', () => {
  it('subscribes each connected account once however often it syncs', async () => {
    const setup = createService();

    await boot(setup, [integration(), integration({ id: 'int-2', userId: 'streamer-2', externalId: '43' })]);
    await setup.service.sync();
    await setup.service.sync();

    expect(sdk.onDonation.mock.calls.map(([user]) => user)).toEqual([42, 43]);
  });

  it('hands the remaining token lifetime to the auth provider', async () => {
    const setup = createService();

    await boot(setup, [integration()]);

    expect(sdk.addUser).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ accessToken: 'a', refreshToken: 'r', expiresIn: 600, scopes: [...DONATION_ALERTS.scopes] })
    );
  });

  it('treats an already expired token as needing a refresh', async () => {
    const setup = createService();

    await boot(setup, [integration({ tokenExpiresAt: addSeconds(NOW, -60) })]);

    expect(sdk.addUser).toHaveBeenCalledWith(42, expect.objectContaining({ expiresIn: 0 }));
  });

  it('skips an account without a refresh token', async () => {
    const setup = createService();

    await boot(setup, [integration({ refreshToken: null })]);

    expect(sdk.onDonation).not.toHaveBeenCalled();
  });

  it('unsubscribes an account whose integration was removed', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.store.byProvider.mockResolvedValue([]);
    await setup.service.sync();

    expect(setup.listener.remove).toHaveBeenCalledTimes(1);
    expect(sdk.removeUser).toHaveBeenCalledWith(42);
  });

  it('drops the events client of an account whose integration was removed', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.store.byProvider.mockResolvedValue([]);
    await setup.service.sync();

    expect(sdk.removeEventsUser).toHaveBeenCalledWith(42);
  });

  it('resubscribes an account that comes back after being removed', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.store.byProvider.mockResolvedValue([]);
    await setup.service.sync();
    setup.store.byProvider.mockResolvedValue([integration()]);
    await setup.service.sync();

    expect(sdk.onDonation).toHaveBeenCalledTimes(2);
  });

  it('survives a failing store read', async () => {
    const setup = createService();

    await boot(setup, []);
    setup.store.byProvider.mockRejectedValue(new Error('db down'));

    await expect(setup.service.sync()).resolves.toBeUndefined();
  });
});

describe('DonationListenerService donations', () => {
  it('forwards every donation to the challenge matcher with a string id', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.challenges.handleDonation.mockResolvedValue(null);
    donationHandler()(donation);
    await flush();

    expect(setup.challenges.handleDonation).toHaveBeenCalledWith({
      streamerUserId: 'streamer-1',
      externalId: String(donation.id),
      donorName: donation.username,
      message: donation.message,
      amount: donation.amount,
      currency: donation.currency
    });
  });

  it('stays silent when the donation matches no challenge', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.challenges.handleDonation.mockResolvedValue(null);
    donationHandler()(donation);
    await flush();

    expect(setup.announcer.announce).not.toHaveBeenCalled();
    expect(setup.publisher.publish).not.toHaveBeenCalled();
  });

  it('announces an activated challenge in chat and refreshes the overlay', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.challenges.handleDonation.mockResolvedValue(mock<Challenge>({ title: 'No arty', donorName: null, accountId: 7n }));
    donationHandler()(donation);
    await flush();

    expect(setup.stats.text).toHaveBeenCalledWith({
      streamerUserId: 'streamer-1',
      message: CHAT_COPY.messages.challengeActive,
      values: { title: 'No arty', donor: donation.username }
    });

    expect(setup.announcer.announce).toHaveBeenCalledWith({ streamerUserId: 'streamer-1', text: 'announcement' });
    expect(setup.publisher.publish).toHaveBeenCalledWith(7n);
  });

  it('prefers the donor name stored on the challenge', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.challenges.handleDonation.mockResolvedValue(mock<Challenge>({ title: 'No arty', donorName: 'Stored', accountId: 7n }));
    donationHandler()(donation);
    await flush();

    expect(setup.stats.text).toHaveBeenCalledWith(expect.objectContaining({ values: { title: 'No arty', donor: 'Stored' } }));
  });

  it('keeps listening when a donation fails to process', async () => {
    const setup = createService();

    await boot(setup, [integration()]);
    setup.challenges.handleDonation.mockRejectedValueOnce(new Error('db down')).mockResolvedValue(null);
    donationHandler()(donation);
    donationHandler()(donation);
    await flush();

    expect(setup.challenges.handleDonation).toHaveBeenCalledTimes(2);
    expect(setup.announcer.announce).not.toHaveBeenCalled();
  });
});

describe('DonationListenerService.onModuleDestroy', () => {
  it('removes every open subscription', async () => {
    const setup = createService();

    await boot(setup, [integration(), integration({ id: 'int-2', userId: 'streamer-2', externalId: '43' })]);
    await setup.service.onModuleDestroy();

    expect(setup.listener.remove).toHaveBeenCalledTimes(2);
  });
});
