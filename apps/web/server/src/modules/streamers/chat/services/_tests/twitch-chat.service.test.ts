import type { RefreshingAuthProvider } from '@twurple/auth';
import type { ChatClient, ChatClientOptions, ChatMessage } from '@twurple/chat';
import type { MockProxy } from 'vitest-mock-extended';

import { ConfigService } from '@nestjs/config';
import { addSeconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { StreamerIntegration } from '../../../../../../generated';
import type { Env } from '../../../../../config/env';
import type { IntegrationStoreService, TwitchSdkService } from '../../../integrations';
import type { StreamerStatsService } from '../streamer-stats.service';

import { AppConfigService } from '../../../../../config';
import { TWITCH } from '../../../integrations';
import { TwitchChatService } from '../twitch-chat.service';

type ChatConnection = { options: ChatClientOptions; client: MockProxy<ChatClient> };

const now = new Date('2026-09-25T12:00:00Z');

const enabledEnv = { TWITCH_CLIENT_ID: 'client-id', TWITCH_CLIENT_SECRET: 'client-secret', NODE_ENV: 'production' } satisfies Partial<Env>;

const integration = (fields: Partial<StreamerIntegration> = {}) =>
  mock<StreamerIntegration>({
    userId: 'streamer-1',
    externalId: 'tw-1',
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenExpiresAt: addSeconds(now, 600),
    config: { login: 'jove' },
    ...fields
  });

const flush = () => new Promise((resolve) => setImmediate(resolve));

const receive = (chat: ChatConnection | undefined, channel: string, text: string) => {
  for (const [handler] of chat?.client.onMessage.mock.calls ?? []) {
    handler(channel, 'viewer', text, mock<ChatMessage>());
  }
};

const createService = (env: Partial<Env> = enabledEnv) => {
  const store = mock<IntegrationStoreService>();
  const stats = mock<StreamerStatsService>();
  const sdk = mock<TwitchSdkService>();
  const auth = mock<RefreshingAuthProvider>();
  const chats: ChatConnection[] = [];

  store.byProvider.mockResolvedValue([]);
  store.storeToken.mockResolvedValue(undefined);
  sdk.createAuthProvider.mockReturnValue(auth);

  sdk.createChatClient.mockImplementation((options) => {
    const client = mock<ChatClient>();

    client.say.mockResolvedValue(undefined);
    chats.push({ options, client });

    return client;
  });

  return {
    service: new TwitchChatService(new AppConfigService(new ConfigService<Env, true>(env)), store, stats, sdk),
    store,
    stats,
    sdk,
    auth,
    chats
  };
};

const boot = async (integrations: StreamerIntegration[] = [integration()]) => {
  const context = createService();

  context.store.byProvider.mockResolvedValue(integrations);
  context.service.onApplicationBootstrap();
  await flush();

  return context;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TwitchChatService bootstrap', () => {
  it('stays disabled without Twitch credentials', async () => {
    const { service, store, sdk } = createService({ TWITCH_CLIENT_ID: '', TWITCH_CLIENT_SECRET: '', NODE_ENV: 'production' });

    service.onApplicationBootstrap();
    await service.sync();

    expect(sdk.createAuthProvider).not.toHaveBeenCalled();
    expect(store.byProvider).not.toHaveBeenCalled();
  });

  it('never connects to Twitch in the test environment', async () => {
    const { service, store, sdk } = createService({ ...enabledEnv, NODE_ENV: 'test' });

    service.onApplicationBootstrap();
    await service.sync();

    expect(sdk.createAuthProvider).not.toHaveBeenCalled();
    expect(store.byProvider).not.toHaveBeenCalled();
  });

  it('joins the chat of every connected streamer on start', async () => {
    const { sdk, chats } = await boot([integration(), integration({ userId: 'streamer-2', externalId: 'tw-2', config: { login: 'near_you' } })]);

    expect(sdk.createAuthProvider).toHaveBeenCalledWith({ clientId: enabledEnv.TWITCH_CLIENT_ID, clientSecret: enabledEnv.TWITCH_CLIENT_SECRET });
    expect(chats.map(({ options }) => options.channels)).toEqual([['jove'], ['near_you']]);
    expect(chats.every(({ client }) => client.connect.mock.calls.length === 1)).toBe(true);
  });

  it('registers the streamer token under a per-user chat intent with its remaining lifetime', async () => {
    const { auth, chats } = await boot();
    const intent = `${TWITCH.intentPrefix}tw-1`;

    expect(auth.addUser).toHaveBeenCalledWith(
      'tw-1',
      { accessToken: 'access', refreshToken: 'refresh', expiresIn: 600, obtainmentTimestamp: now.getTime() },
      [intent]
    );

    expect(chats[0]?.options.authIntents).toEqual([intent]);
  });

  it('treats an already expired token as zero seconds left and a token without expiry as open-ended', async () => {
    const { auth } = await boot([
      integration({ tokenExpiresAt: addSeconds(now, -60) }),
      integration({ userId: 'streamer-2', externalId: 'tw-2', tokenExpiresAt: null })
    ]);

    expect(auth.addUser.mock.calls.map(([, token]) => token.expiresIn)).toEqual([0, null]);
  });

  it('skips integrations without a login or an access token', async () => {
    const { chats } = await boot([
      integration({ config: {} }),
      integration({ userId: 'streamer-2', accessToken: null }),
      integration({ userId: 'streamer-3', config: { login: 42 } })
    ]);

    expect(chats).toHaveLength(0);
  });

  it('persists refreshed tokens with an absolute expiry', async () => {
    const { auth, store } = await boot();
    const [handler] = auth.onRefresh.mock.calls[0] ?? [];
    const obtainedAt = now.getTime();

    handler?.('tw-1', { accessToken: 'new-access', refreshToken: 'new-refresh', scope: [], expiresIn: 3600, obtainmentTimestamp: obtainedAt });
    handler?.('tw-1', { accessToken: 'forever', refreshToken: null, scope: [], expiresIn: null, obtainmentTimestamp: obtainedAt });

    expect(store.storeToken).toHaveBeenNthCalledWith(1, {
      provider: 'twitch',
      externalId: 'tw-1',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: addSeconds(obtainedAt, 3600)
    });

    expect(store.storeToken).toHaveBeenNthCalledWith(2, expect.objectContaining({ accessToken: 'forever', expiresAt: null }));
  });
});

describe('TwitchChatService.sync', () => {
  it('keeps existing connections instead of reconnecting', async () => {
    const { service, chats } = await boot();

    await service.sync();

    expect(chats).toHaveLength(1);
  });

  it('leaves the chat and forgets the token of a disconnected streamer', async () => {
    const { service, store, auth, chats } = await boot();
    const client = chats[0]?.client;

    store.byProvider.mockResolvedValue([]);
    await service.sync();

    expect(client?.quit).toHaveBeenCalledTimes(1);
    expect(auth.removeUser).toHaveBeenCalledWith('tw-1');

    await service.announce({ streamerUserId: 'streamer-1', text: 'hi' });
    expect(client?.say).not.toHaveBeenCalled();
  });

  it('survives a failing integration lookup', async () => {
    const { service, store, chats } = await boot();

    store.byProvider.mockRejectedValue(new Error('db down'));

    await expect(service.sync()).resolves.toBeUndefined();
    expect(chats[0]?.client.quit).not.toHaveBeenCalled();
  });
});

describe('TwitchChatService.announce', () => {
  it('posts to the streamer channel', async () => {
    const { service, chats } = await boot();

    await service.announce({ streamerUserId: 'streamer-1', text: 'Челлендж начался' });

    expect(chats[0]?.client.say).toHaveBeenCalledWith('jove', 'Челлендж начался');
  });

  it('is a no-op for a streamer without a chat connection', async () => {
    const { service, chats } = await boot();

    await expect(service.announce({ streamerUserId: 'stranger', text: 'hi' })).resolves.toBeUndefined();
    expect(chats[0]?.client.say).not.toHaveBeenCalled();
  });
});

describe('TwitchChatService chat commands', () => {
  it('answers a known command in the channel it came from', async () => {
    const { stats, chats } = await boot();
    const [chat] = chats;

    stats.reply.mockResolvedValue('Jove: 55% побед');
    receive(chat, '#jove', '!stat please');
    await flush();

    expect(stats.reply).toHaveBeenCalledWith({ streamerUserId: 'streamer-1', command: 'stat' });
    expect(chat?.client.say).toHaveBeenCalledWith('#jove', 'Jove: 55% побед');
  });

  it('ignores ordinary messages and unknown commands', async () => {
    const { stats, chats } = await boot();
    const [chat] = chats;

    receive(chat, '#jove', 'hello');
    receive(chat, '#jove', '!dance');
    await flush();

    expect(stats.reply).not.toHaveBeenCalled();
  });

  it('stays silent when there is nothing to answer or the answer fails', async () => {
    const { stats, chats } = await boot();
    const [chat] = chats;

    stats.reply.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('no profile'));
    receive(chat, '#jove', '!session');
    receive(chat, '#jove', '!marks');
    await flush();

    expect(stats.reply).toHaveBeenCalledTimes(2);
    expect(chat?.client.say).not.toHaveBeenCalled();
  });
});

describe('TwitchChatService.onModuleDestroy', () => {
  it('leaves every chat and drops the connections', async () => {
    const { service, chats } = await boot([integration(), integration({ userId: 'streamer-2', externalId: 'tw-2', config: { login: 'near_you' } })]);

    service.onModuleDestroy();

    expect(chats.map(({ client }) => client.quit.mock.calls.length)).toEqual([1, 1]);
    await service.announce({ streamerUserId: 'streamer-1', text: 'hi' });
    expect(chats[0]?.client.say).not.toHaveBeenCalled();
  });
});
