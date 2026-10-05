import type { ApiClient, HelixStream, HelixUser } from '@twurple/api';
import type { Options } from 'ky';

import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Env } from '../../../../../config/env';
import type { HttpClientService, HttpRequestInput } from '../../../../../core';
import type { TwitchSdkService } from '../../../integrations';
import type { FeedReaderService } from '../feed-reader.service';

import { AppConfigService } from '../../../../../config';
import { http } from '../../../../../lib/http';
import { LIVE } from '../../config/live.constants';
import { LivePlatformsService } from '../live-platforms.service';

type Route = (url: URL, request: Request) => unknown;

const now = new Date('2026-09-25T12:00:00Z');
const tokenLifetimeSeconds = 3600;

const credentials = {
  TWITCH_CLIENT_ID: 'twitch-id',
  TWITCH_CLIENT_SECRET: 'twitch-secret',
  VK_LIVE_CLIENT_ID: 'vk-id',
  VK_LIVE_CLIENT_SECRET: 'vk-secret',
  YOUTUBE_API_KEY: 'yt-key'
} satisfies Partial<Env>;

const noCredentials = {
  TWITCH_CLIENT_ID: '',
  TWITCH_CLIENT_SECRET: '',
  VK_LIVE_CLIENT_ID: '',
  VK_LIVE_CLIENT_SECRET: '',
  YOUTUBE_API_KEY: ''
} satisfies Partial<Env>;

const twitchApi = mockDeep<ApiClient>();
const createAppApiClient = vi.fn<TwitchSdkService['createAppApiClient']>();
const readFeed = vi.fn<FeedReaderService['read']>();

const requests: Request[] = [];
let route: Route = () => ({});

const serve = (next: Route) => {
  route = next;
};

const fetch: NonNullable<Options['fetch']> = async (input, init) => {
  const request = input instanceof Request ? new Request(input, init) : new Request(String(input), init);

  requests.push(request);
  const body = route(new URL(request.url), request);

  return body instanceof Response ? body : Response.json(body);
};

const httpClient = mock<HttpClientService>({
  getJson: ({ url, options }: HttpRequestInput) => http.get(url, { ...options, fetch }).json(),
  requestJson: ({ url, options }: HttpRequestInput) => http(url, { ...options, fetch }).json()
});

const createService = (env: Partial<Env> = credentials) =>
  new LivePlatformsService(
    new AppConfigService(new ConfigService<Env, true>(env)),
    httpClient,
    mock<TwitchSdkService>({ createAppApiClient }),
    mock<FeedReaderService>({ read: readFeed })
  );

const onlineTwitch = (online: Record<string, number>) => {
  twitchApi.streams.getStreamsByUserNames.mockImplementation(async (logins) =>
    logins
      .map(String)
      .filter((login) => login in online)
      .map((login) => mock<HelixStream>({ userName: login.toUpperCase(), viewers: online[login] }))
  );
};

const vkApi =
  (channels: unknown[]): Route =>
  (url) =>
    url.href === LIVE.vk.tokenUrl ? { access_token: 'vk-token', expires_in: tokenLifetimeSeconds } : { data: { channels } };

beforeEach(() => {
  requests.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);

  createAppApiClient.mockReset();
  readFeed.mockReset();
  twitchApi.streams.getStreamsByUserNames.mockReset();
  twitchApi.users.getUserByName.mockReset();

  createAppApiClient.mockReturnValue(twitchApi);
  onlineTwitch({});
  twitchApi.users.getUserByName.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LivePlatformsService.twitchStreams', () => {
  it('reports nothing and calls nobody when Twitch credentials are missing', async () => {
    onlineTwitch({ jove: 10 });

    await expect(createService(noCredentials).twitchStreams(['jove'])).resolves.toEqual([]);
    expect(createAppApiClient).not.toHaveBeenCalled();
  });

  it('reports nothing for an empty handle list', async () => {
    await expect(createService().twitchStreams([])).resolves.toEqual([]);
    expect(twitchApi.streams.getStreamsByUserNames).not.toHaveBeenCalled();
  });

  it('returns only online channels with lowercased handles and their viewer counts', async () => {
    onlineTwitch({ jove: 1200, near_you: 0 });

    await expect(createService().twitchStreams(['jove', 'near_you', 'offline'])).resolves.toEqual([
      { platform: 'twitch', handle: 'jove', viewers: 1200 },
      { platform: 'twitch', handle: 'near_you', viewers: 0 }
    ]);
  });

  it('builds the app-token client from the configured credentials', async () => {
    await createService().twitchStreams(['jove']);

    expect(createAppApiClient).toHaveBeenCalledWith({ clientId: credentials.TWITCH_CLIENT_ID, clientSecret: credentials.TWITCH_CLIENT_SECRET });
  });

  it('builds the client once and reuses it across polls', async () => {
    const service = createService();

    await service.twitchStreams(['jove']);
    await service.twitchDescription('jove');
    await service.twitchStreams(['jove']);

    expect(createAppApiClient).toHaveBeenCalledOnce();
  });

  it('splits logins into batches of the Helix limit', async () => {
    const logins = Array.from({ length: LIVE.twitch.batch + 1 }, (_, index) => `streamer${index}`);

    await createService().twitchStreams(logins);

    expect(twitchApi.streams.getStreamsByUserNames).toHaveBeenCalledTimes(2);
    expect(twitchApi.streams.getStreamsByUserNames.mock.calls[0]?.[0]).toHaveLength(LIVE.twitch.batch);
    expect(twitchApi.streams.getStreamsByUserNames.mock.calls[1]?.[0]).toEqual([`streamer${LIVE.twitch.batch}`]);
  });

  it('propagates a failed Helix call', async () => {
    twitchApi.streams.getStreamsByUserNames.mockRejectedValue(new Error('500'));

    await expect(createService().twitchStreams(['jove'])).rejects.toThrow('500');
  });
});

describe('LivePlatformsService.twitchDescription', () => {
  it('returns the channel bio', async () => {
    twitchApi.users.getUserByName.mockResolvedValue(mock<HelixUser>({ description: 'Мир танков каждый день' }));

    await expect(createService().twitchDescription('jove')).resolves.toBe('Мир танков каждый день');
    expect(twitchApi.users.getUserByName).toHaveBeenCalledWith('jove');
  });

  it('returns an empty bio as an empty string', async () => {
    twitchApi.users.getUserByName.mockResolvedValue(mock<HelixUser>({ description: '' }));

    await expect(createService().twitchDescription('jove')).resolves.toBe('');
  });

  it('returns null for an unknown login', async () => {
    await expect(createService().twitchDescription('ghost')).resolves.toBeNull();
  });

  it('returns null without calling Twitch when credentials are missing', async () => {
    twitchApi.users.getUserByName.mockResolvedValue(mock<HelixUser>({ description: 'bio' }));

    await expect(createService(noCredentials).twitchDescription('jove')).resolves.toBeNull();
    expect(createAppApiClient).not.toHaveBeenCalled();
  });
});

describe('LivePlatformsService.vkStreams', () => {
  it('returns only online channels that carry a nick', async () => {
    serve(
      vkApi([
        { channel: { nick: 'Jove' }, stream: { status: 'online', counters: { viewers: 300 } } },
        { channel: { nick: 'sleeper' }, stream: { status: 'offline' } },
        { channel: {}, stream: { status: 'online' } },
        { channel: { nick: 'quiet' }, stream: { status: 'online' } }
      ])
    );

    await expect(createService().vkStreams(['jove', 'sleeper', 'x', 'quiet'])).resolves.toEqual([
      { platform: 'vkVideoLive', handle: 'jove', viewers: 300 },
      { platform: 'vkVideoLive', handle: 'quiet', viewers: null }
    ]);
  });

  it('asks for channels by their live.vkvideo.ru url with a client-credentials bearer token', async () => {
    serve(vkApi([]));

    await createService().vkStreams(['jove']);

    const [tokenRequest, channelsRequest] = requests;
    const basic = Buffer.from(`${credentials.VK_LIVE_CLIENT_ID}:${credentials.VK_LIVE_CLIENT_SECRET}`).toString('base64');

    expect(tokenRequest?.url).toBe(LIVE.vk.tokenUrl);
    expect(tokenRequest?.headers.get('authorization')).toBe(`Basic ${basic}`);
    expect(channelsRequest?.headers.get('authorization')).toBe('Bearer vk-token');
    await expect(channelsRequest?.json()).resolves.toEqual({ channels: [{ url: `${LIVE.vk.channelUrl}/jove` }] });
  });

  it('reuses the VK token until it expires', async () => {
    serve(vkApi([]));
    const service = createService();
    const tokenRequests = () => requests.filter((request) => request.url === LIVE.vk.tokenUrl).length;

    await service.vkStreams(['jove']);
    await service.vkStreams(['jove']);
    expect(tokenRequests()).toBe(1);

    vi.setSystemTime(now.getTime() + tokenLifetimeSeconds * LIVE.tokenMsPerSecond + 1);
    await service.vkStreams(['jove']);
    expect(tokenRequests()).toBe(2);
  });

  it('reports nothing without VK credentials or handles', async () => {
    serve(vkApi([{ channel: { nick: 'jove' }, stream: { status: 'online' } }]));

    await expect(createService(noCredentials).vkStreams(['jove'])).resolves.toEqual([]);
    await expect(createService().vkStreams([])).resolves.toEqual([]);
    expect(requests).toHaveLength(0);
  });
});

describe('LivePlatformsService.vkDescription', () => {
  it('returns the channel description', async () => {
    serve(vkApi([{ channel: { nick: 'jove', description: 'стримы' } }]));

    await expect(createService().vkDescription('jove')).resolves.toBe('стримы');
  });

  it('returns null when VK knows no such channel', async () => {
    serve(vkApi([]));

    await expect(createService().vkDescription('ghost')).resolves.toBeNull();
  });

  it('returns null without VK credentials', async () => {
    serve(vkApi([]));

    await expect(createService(noCredentials).vkDescription('jove')).resolves.toBeNull();
    expect(requests).toHaveLength(0);
  });
});

describe('LivePlatformsService.youtubeLive', () => {
  const liveChannel = 'UCLive';
  const idleChannel = 'UCIdle';
  const brokenChannel = 'UCBroken';

  const youtubeApi: Route = (url) => {
    const channelId = url.searchParams.get('channelId');

    if (channelId === brokenChannel) {
      return new Response('quota', { status: 403 });
    }

    return { items: channelId === liveChannel ? [{ id: { videoId: 'v1' } }] : [] };
  };

  it('reports channels that have a live broadcast, lowercasing the channel id', async () => {
    serve(youtubeApi);

    await expect(createService().youtubeLive([liveChannel, idleChannel])).resolves.toEqual([
      { platform: 'youtube', handle: liveChannel.toLowerCase(), viewers: null }
    ]);
  });

  it('skips a channel whose check fails and keeps checking the rest', async () => {
    serve(youtubeApi);

    await expect(createService().youtubeLive([brokenChannel, liveChannel])).resolves.toEqual([
      { platform: 'youtube', handle: liveChannel.toLowerCase(), viewers: null }
    ]);
  });

  it('passes the API key with each search', async () => {
    serve(youtubeApi);

    await createService().youtubeLive([idleChannel]);

    expect(new URL(requests[0]?.url ?? '').searchParams.get('key')).toBe(credentials.YOUTUBE_API_KEY);
  });

  it('reports nothing without an API key', async () => {
    serve(youtubeApi);

    await expect(createService(noCredentials).youtubeLive([liveChannel])).resolves.toEqual([]);
    expect(requests).toHaveLength(0);
  });
});

describe('LivePlatformsService.youtubeDescription', () => {
  it('returns the channel snippet description', async () => {
    serve(() => ({ items: [{ snippet: { description: 'про танки' } }] }));

    await expect(createService().youtubeDescription('UC1')).resolves.toBe('про танки');
  });

  it('returns null for an unknown channel or without an API key', async () => {
    serve(() => ({ items: [] }));

    await expect(createService().youtubeDescription('UC1')).resolves.toBeNull();
    await expect(createService(noCredentials).youtubeDescription('UC1')).resolves.toBeNull();
  });
});

describe('LivePlatformsService.youtubeVideos', () => {
  const item = (index: number) => ({
    id: `yt:video:${index}`,
    link: `https://youtu.be/${index}`,
    title: `Video ${index}`,
    isoDate: `2026-09-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`
  });

  it('maps the newest feed entries up to the videos limit', async () => {
    readFeed.mockResolvedValue({ items: Array.from({ length: LIVE.youtube.videosLimit + 2 }, (_, index) => item(index)) });

    const videos = await createService(noCredentials).youtubeVideos('UC1');

    expect(videos).toHaveLength(LIVE.youtube.videosLimit);
    expect(videos[0]).toEqual({ id: item(0).id, title: item(0).title, url: item(0).link, publishedAt: item(0).isoDate });
  });

  it('reads the feed for the url-encoded channel id', async () => {
    readFeed.mockResolvedValue({ items: [] });

    await createService().youtubeVideos('UC a&b');

    expect(readFeed).toHaveBeenCalledWith(`${LIVE.youtube.rssUrl}?channel_id=${encodeURIComponent('UC a&b')}`);
  });

  it('drops entries missing a link, title or date and falls back to the link as id', async () => {
    const { id: _id, ...withoutId } = item(1);

    readFeed.mockResolvedValue({ items: [{ ...item(0), title: undefined }, withoutId, { ...item(2), isoDate: undefined }] });

    await expect(createService().youtubeVideos('UC1')).resolves.toEqual([
      { id: withoutId.link, title: withoutId.title, url: withoutId.link, publishedAt: withoutId.isoDate }
    ]);
  });

  it('returns an empty list when the feed cannot be read', async () => {
    readFeed.mockRejectedValue(new Error('404'));

    await expect(createService().youtubeVideos('UC1')).resolves.toEqual([]);
  });
});
