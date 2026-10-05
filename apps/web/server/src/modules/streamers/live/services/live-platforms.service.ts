import type { StreamerVideo } from '@otmetki/schemas';
import type { ApiClient } from '@twurple/api';

import { Injectable, Logger } from '@nestjs/common';
import { chunk } from 'remeda';
import Parser from 'rss-parser';

import type { LiveStream } from '../lib/live-status/live-status.types';
import type { CachedToken } from '../live.types';

import { errorMessage } from '../../../../common/lib';
import { AppConfigService } from '../../../../config';
import { HttpClientService } from '../../../../core';
import { TwitchSdkService } from '../../integrations';
import { LIVE } from '../config/live.constants';
import { vkChannelsSchema, vkTokenSchema, youtubeChannelSchema, youtubeLiveSchema } from '../dto/live.schemas';

@Injectable()
export class LivePlatformsService {
  private readonly logger = new Logger(LivePlatformsService.name);
  private twitchClient: ApiClient | null = null;
  private vkToken: CachedToken | null = null;
  private readonly feedParser = new Parser();

  constructor(
    private readonly config: AppConfigService,
    private readonly http: HttpClientService,
    private readonly twitch: TwitchSdkService
  ) {}

  hasTwitch(): boolean {
    return this.config.get('TWITCH_CLIENT_ID') !== '' && this.config.get('TWITCH_CLIENT_SECRET') !== '';
  }

  hasVk(): boolean {
    return this.config.get('VK_LIVE_CLIENT_ID') !== '' && this.config.get('VK_LIVE_CLIENT_SECRET') !== '';
  }

  hasYoutube(): boolean {
    return this.config.get('YOUTUBE_API_KEY') !== '';
  }

  async twitchStreams(logins: readonly string[]): Promise<LiveStream[]> {
    if (!this.hasTwitch() || logins.length === 0) {
      return [];
    }

    const streams: LiveStream[] = [];

    for (const part of chunk([...logins], LIVE.twitch.batch)) {
      const page = await this.twitchApi().streams.getStreams({ userName: part, limit: part.length });

      for (const stream of page.data) {
        streams.push({ platform: 'twitch', handle: stream.userName.toLowerCase(), viewers: stream.viewers });
      }
    }

    return streams;
  }

  async twitchDescription(login: string): Promise<string | null> {
    if (!this.hasTwitch()) {
      return null;
    }

    const user = await this.twitchApi().users.getUserByName(login);

    return user?.description ?? null;
  }

  async vkStreams(handles: readonly string[]): Promise<LiveStream[]> {
    if (!this.hasVk() || handles.length === 0) {
      return [];
    }

    const streams: LiveStream[] = [];

    for (const part of chunk([...handles], LIVE.vk.batch)) {
      for (const entry of await this.vkChannels(part)) {
        const handle = entry.channel.nick?.toLowerCase() ?? '';

        if (handle !== '' && entry.stream?.status === 'online') {
          streams.push({ platform: 'vkVideoLive', handle, viewers: entry.stream.counters?.viewers ?? null });
        }
      }
    }

    return streams;
  }

  async vkDescription(handle: string): Promise<string | null> {
    if (!this.hasVk()) {
      return null;
    }

    return (await this.vkChannels([handle]))[0]?.channel.description ?? null;
  }

  async youtubeLive(channelIds: readonly string[]): Promise<LiveStream[]> {
    if (!this.hasYoutube()) {
      return [];
    }

    const streams: LiveStream[] = [];

    for (const channelId of channelIds) {
      try {
        const body = await this.http.getJson({
          url: `${LIVE.youtube.apiUrl}/search`,
          schema: youtubeLiveSchema,
          options: { retry: 0, searchParams: { part: 'id', channelId, eventType: 'live', type: 'video', key: this.config.get('YOUTUBE_API_KEY') } }
        });

        if (body.items.length > 0) {
          streams.push({ platform: 'youtube', handle: channelId.toLowerCase(), viewers: null });
        }
      } catch (error) {
        this.logger.warn(`youtube live check failed for ${channelId}: ${errorMessage(error)}`);
      }
    }

    return streams;
  }

  async youtubeDescription(channelId: string): Promise<string | null> {
    if (!this.hasYoutube()) {
      return null;
    }

    const body = await this.http.getJson({
      url: `${LIVE.youtube.apiUrl}/channels`,
      schema: youtubeChannelSchema,
      options: { retry: 0, searchParams: { part: 'snippet', id: channelId, key: this.config.get('YOUTUBE_API_KEY') } }
    });

    return body.items[0]?.snippet.description ?? null;
  }

  async youtubeVideos(channelId: string): Promise<StreamerVideo[]> {
    try {
      const xml = await this.http.getText({ url: LIVE.youtube.rssUrl, options: { searchParams: { channel_id: channelId } } });
      const feed = await this.feedParser.parseString(xml);

      return feed.items
        .slice(0, LIVE.youtube.videosLimit)
        .flatMap((item) =>
          item.link && item.title && item.isoDate ? [{ id: item.id ?? item.link, title: item.title, url: item.link, publishedAt: item.isoDate }] : []
        );
    } catch (error) {
      this.logger.warn(`youtube rss failed for ${channelId}: ${errorMessage(error)}`);

      return [];
    }
  }

  private async vkChannels(handles: readonly string[]) {
    const token = await this.vkAccess();
    const body = await this.http.requestJson({
      url: `${LIVE.vk.apiUrl}/v1/channels`,
      schema: vkChannelsSchema,
      options: {
        method: 'post',
        json: { channels: handles.map((handle) => ({ url: `${LIVE.vk.channelUrl}/${handle}` })) },
        headers: { authorization: `Bearer ${token}` }
      }
    });

    return body.data.channels;
  }

  private twitchApi(): ApiClient {
    this.twitchClient ??= this.twitch.createAppApiClient({
      clientId: this.config.get('TWITCH_CLIENT_ID'),
      clientSecret: this.config.get('TWITCH_CLIENT_SECRET')
    });

    return this.twitchClient;
  }

  private async vkAccess(): Promise<string> {
    if (this.vkToken && this.vkToken.expiresAt > Date.now()) {
      return this.vkToken.value;
    }

    const credentials = Buffer.from(`${this.config.get('VK_LIVE_CLIENT_ID')}:${this.config.get('VK_LIVE_CLIENT_SECRET')}`).toString('base64');
    const token = await this.http.requestJson({
      url: LIVE.vk.tokenUrl,
      schema: vkTokenSchema,
      options: { method: 'post', body: new URLSearchParams({ grant_type: 'client_credentials' }), headers: { authorization: `Basic ${credentials}` } }
    });

    this.vkToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * LIVE.tokenMsPerSecond };

    return token.access_token;
  }
}
