import { sign } from '@telegram-apps/init-data-node';
import { subHours, subSeconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyWebAppInitData } from '../webapp-auth';
import { WEBAPP_AUTH } from '../webapp-auth.constants';

const botToken = '123456:TEST-token';

const NOW = new Date('2026-09-26T12:00:00Z');

type SignedInput = {
  token?: string;
  authDate?: Date;
  user?: { id: number; first_name: string; username?: string; language_code?: string };
};

const defaultUser = { id: 42, first_name: 'Ivan', username: 'ivan', language_code: 'ru' };

const signed = ({ token = botToken, authDate = NOW, user = defaultUser }: SignedInput = {}) => sign({ user, query_id: 'q' }, token, authDate);

describe('verifyWebAppInitData', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts init data signed with our bot token', () => {
    expect(verifyWebAppInitData({ initData: signed(), botToken })).toEqual({
      telegramId: 42n,
      username: 'ivan',
      name: 'ivan',
      languageCode: 'ru'
    });
  });

  it('rejects init data signed by another bot', () => {
    expect(verifyWebAppInitData({ initData: signed({ token: '999:OTHER' }), botToken })).toBeNull();
  });

  it('rejects tampered init data', () => {
    const initData = signed().replace('ivan', 'eve');

    expect(verifyWebAppInitData({ initData, botToken })).toBeNull();
  });

  it('accepts init data exactly at the allowed age', () => {
    const authDate = subSeconds(NOW, WEBAPP_AUTH.maxAgeSeconds);

    expect(verifyWebAppInitData({ initData: signed({ authDate }), botToken })).toMatchObject({ telegramId: 42n });
  });

  it('rejects init data one second older than the allowed age', () => {
    const authDate = subSeconds(NOW, WEBAPP_AUTH.maxAgeSeconds + 1);

    expect(verifyWebAppInitData({ initData: signed({ authDate }), botToken })).toBeNull();
  });

  it('rejects init data signed more than an hour ago, so a leaked link cannot sign in for a day', () => {
    const authDate = subSeconds(subHours(NOW, 1), 1);

    expect(verifyWebAppInitData({ initData: signed({ authDate }), botToken })).toBeNull();
  });

  it('rejects everything when the bot is not configured', () => {
    expect(verifyWebAppInitData({ initData: signed(), botToken: '' })).toBeNull();
  });

  it('falls back to the first name when there is no username', () => {
    const initData = signed({ user: { id: 7, first_name: 'Anna' } });

    expect(verifyWebAppInitData({ initData, botToken })?.name).toBe('Anna');
  });
});
