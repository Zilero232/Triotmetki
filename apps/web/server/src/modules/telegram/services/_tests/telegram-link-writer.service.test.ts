import { addMinutes } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { NotificationSettings, OneTimeCode, TelegramAccount, User } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { CommunityContentWriterService } from '../../../community-core';
import type { TelegramIdentityWriterService } from '../telegram-identity-writer.service';

import { AppBadRequestException, AppConflictException } from '../../../../common/exceptions';
import { AUTH_PROVIDER, placeholderEmail } from '../../../../lib/auth';
import { LINK_CODE } from '../../config/link-code.constants';
import { WEB_LOGIN } from '../../config/web-login.constants';
import { DISPOSABLE_USER_COUNTS } from '../../selects/disposable-user.selects';
import { TelegramLinkWriterService } from '../telegram-link-writer.service';

const identity = { telegramId: 42n, username: 'ivan', name: 'ivan', languageCode: 'ru' };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();
  const identities = mock<TelegramIdentityWriterService>();
  const communityContent = mock<CommunityContentWriterService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.oneTimeCode.findUniqueOrThrow.mockResolvedValue(mock<OneTimeCode>({ userId: 'site-user' }));
  prisma.notificationSettings.findUnique.mockResolvedValue(null);
  config.get.mockReturnValue('otmetki_bot');

  return { service: new TelegramLinkWriterService(prisma, config, identities, communityContent), prisma, config, identities, communityContent };
};

const emptyCounts = Object.fromEntries(Object.keys(DISPOSABLE_USER_COUNTS).map((relation) => [relation, 0]));

type HeldData = {
  accounts: { id: string }[];
  streamerProfile: { id: string } | null;
  settingsShare: { userId: string } | null;
  coachProfile: { userId: string } | null;
  referredBy: { referredUserId: string } | null;
  _count: Record<string, number>;
};

const NOTHING_HELD: HeldData = {
  accounts: [],
  streamerProfile: null,
  settingsShare: null,
  coachProfile: null,
  referredBy: null,
  _count: emptyCounts
};

const disposable = (id: string) => ({
  ...mock<User>({ id, email: placeholderEmail({ provider: AUTH_PROVIDER.telegram, id: 42 }) }),
  ...NOTHING_HELD
});

const holding = (overrides: Partial<HeldData>) => ({ ...disposable('bot-user'), ...overrides });

describe('TelegramLinkWriterService.consumeCode', () => {
  it('refuses an unknown, used or expired code', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.consumeCode({ code: 'ABCDEFGH', identity })).rejects.toBeInstanceOf(AppBadRequestException);
    expect(prisma.telegramAccount.upsert).not.toHaveBeenCalled();
  });

  it('links the chat to the code owner and switches telegram notifications on', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(null);

    expect(await service.consumeCode({ code: 'abcd efgh', identity })).toBe('site-user');

    expect(prisma.oneTimeCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ code: 'ABCDEFGH', purpose: 'telegramLink', usedAt: null }) })
    );

    expect(prisma.telegramAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { telegramId: 42n } }));

    expect(prisma.notificationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ channels: expect.arrayContaining(['telegram']) }) })
    );
  });

  it('refuses to steal a chat that belongs to a real account', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'other-user' }));
    prisma.user.findUnique.mockResolvedValue({ ...disposable('other-user'), email: 'real@example.com' });

    await expect(service.consumeCode({ code: 'ABCDEFGH', identity })).rejects.toBeInstanceOf(AppConflictException);
  });

  it('absorbs an empty account the bot created for the same chat', async () => {
    const { service, prisma, communityContent } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'bot-user' }));
    prisma.user.findUnique.mockResolvedValue(disposable('bot-user'));

    await service.consumeCode({ code: 'ABCDEFGH', identity });

    expect(communityContent.purgeAuthoredBy).toHaveBeenCalledWith({ userId: 'bot-user', db: prisma });
    expect(prisma.user.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'bot-user' } }));
  });
});

describe('TelegramLinkWriterService.consumeCode with a placeholder account that holds data', () => {
  it.each(Object.keys(DISPOSABLE_USER_COUNTS))('refuses to delete an account that has %s', async (relation) => {
    const { service, prisma, communityContent } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'bot-user' }));
    prisma.user.findUnique.mockResolvedValue(holding({ _count: { ...emptyCounts, [relation]: 1 } }));

    await expect(service.consumeCode({ code: 'ABCDEFGH', identity })).rejects.toBeInstanceOf(AppConflictException);
    expect(communityContent.purgeAuthoredBy).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete an account that signs in another way', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'bot-user' }));
    prisma.user.findUnique.mockResolvedValue(holding({ accounts: [{ id: 'vk-account' }] }));

    await expect(service.consumeCode({ code: 'ABCDEFGH', identity })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete an account that owns a streamer page', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'bot-user' }));
    prisma.user.findUnique.mockResolvedValue(holding({ streamerProfile: { id: 'p1' } }));

    await expect(service.consumeCode({ code: 'ABCDEFGH', identity })).rejects.toBeInstanceOf(AppConflictException);
  });
});

describe('TelegramLinkWriterService.previewCode', () => {
  it('names the account a fresh code would link to', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.findFirst.mockResolvedValue(mock<OneTimeCode & { user: User }>({ user: { name: 'Owner' } }));

    expect(await service.previewCode('abcd efgh')).toEqual({ code: 'ABCDEFGH', accountName: 'Owner' });

    expect(prisma.oneTimeCode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ code: 'ABCDEFGH', purpose: 'telegramLink', usedAt: null }) })
    );
  });

  it('returns null for an unknown, used or expired code without consuming it', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.findFirst.mockResolvedValue(null);

    expect(await service.previewCode('ABCDEFGH')).toBeNull();
    expect(prisma.oneTimeCode.updateMany).not.toHaveBeenCalled();
  });
});

describe('TelegramLinkWriterService.redeemWebLogin', () => {
  it('issues a session only for a fresh one-time code', async () => {
    const { service, prisma, identities } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    prisma.oneTimeCode.findUniqueOrThrow.mockResolvedValue({
      code: 'c',
      purpose: 'telegramWebLogin',
      userId: 'u1',
      accountId: null,
      deviceId: null,
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date()
    });

    identities.issueSessionToken.mockResolvedValue('session-token');

    expect(await service.redeemWebLogin('c')).toBe('session-token');
    await expect(service.redeemWebLogin('c')).rejects.toBeInstanceOf(AppBadRequestException);

    expect(prisma.oneTimeCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ code: 'c', purpose: 'telegramWebLogin', usedAt: null }) })
    );
  });

  it('never redeems a link code as a web login', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.redeemWebLogin('ABCDEFGH')).rejects.toBeInstanceOf(AppBadRequestException);
    expect(prisma.oneTimeCode.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

describe('TelegramLinkWriterService.issueCode', () => {
  it('replaces only the previous link codes of the user', async () => {
    const { service, prisma } = createService();

    await service.issueCode('u1');

    expect(prisma.oneTimeCode.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', purpose: 'telegramLink' } }));

    expect(prisma.oneTimeCode.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ purpose: 'telegramLink', userId: 'u1' }) })
    );
  });
});

describe('TelegramLinkWriterService.consumeCode for a chat already linked to the same user', () => {
  it('relinks without deleting the owner and moves other chats off the user', async () => {
    const { service, prisma, communityContent } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'site-user' }));

    expect(await service.consumeCode({ code: 'ABCDEFGH', identity })).toBe('site-user');

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(communityContent.purgeAuthoredBy).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.telegramAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: 'site-user', NOT: { telegramId: 42n } } });

    expect(prisma.account.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'site-user', providerId: AUTH_PROVIDER.telegram, NOT: { accountId: '42' } }
    });
  });

  it('refuses when the holder of the chat no longer exists', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ userId: 'ghost' }));
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.consumeCode({ code: 'ABCDEFGH', identity })).rejects.toBeInstanceOf(AppConflictException);
  });

  it('leaves telegram notifications alone when they are already on', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(null);
    prisma.notificationSettings.findUnique.mockResolvedValue({ ...mock<NotificationSettings>(), channels: ['site', 'telegram'] });

    await service.consumeCode({ code: 'ABCDEFGH', identity });

    expect(prisma.notificationSettings.upsert).not.toHaveBeenCalled();
  });

  it('adds telegram to existing settings instead of resetting them', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.telegramAccount.findUnique.mockResolvedValue(null);
    prisma.notificationSettings.findUnique.mockResolvedValue({ ...mock<NotificationSettings>(), channels: ['site'] });

    await service.consumeCode({ code: 'ABCDEFGH', identity });

    expect(prisma.notificationSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { channels: { push: 'telegram' } } }));
  });
});

describe('TelegramLinkWriterService.issueCode deep link', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a bot deep link carrying the code', async () => {
    const { service } = createService();

    const issued = await service.issueCode('u1');

    expect(issued.deepLink).toBe(`https://t.me/otmetki_bot?start=${issued.code}`);
  });

  it('returns no deep link when no bot is configured', async () => {
    const { service, config } = createService();

    config.get.mockReturnValue('');

    expect((await service.issueCode('u1')).deepLink).toBeNull();
  });

  it('expires the code after the configured time', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-27T10:00:00Z') });

    const { service } = createService();

    expect((await service.issueCode('u1')).expiresAt).toBe(addMinutes(new Date('2026-09-27T10:00:00Z'), LINK_CODE.ttlMinutes).toISOString());
  });
});

describe('TelegramLinkWriterService.status', () => {
  it('reports the linked username and the bot', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ username: 'ivan' }));

    expect(await service.status('u1')).toEqual({ isLinked: true, username: 'ivan', botUsername: 'otmetki_bot' });
  });

  it('reports an unlinked user and no bot when none is configured', async () => {
    const { service, prisma, config } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(null);
    config.get.mockReturnValue('');

    expect(await service.status('u1')).toEqual({ isLinked: false, username: null, botUsername: null });
  });

  it('reports a linked chat without a username', async () => {
    const { service, prisma } = createService();

    prisma.telegramAccount.findUnique.mockResolvedValue(mock<TelegramAccount>({ username: null }));

    expect(await service.status('u1')).toEqual(expect.objectContaining({ isLinked: true, username: null }));
  });
});

describe('TelegramLinkWriterService.unlink', () => {
  const userWith = ({ email, accounts }: { email: string; accounts: { id: string }[] }) => ({ ...mock<User>({ email }), accounts });

  it('refuses to cut the only way into a telegram-born account', async () => {
    const { service, prisma } = createService();

    prisma.user.findUniqueOrThrow.mockResolvedValue(
      userWith({ email: placeholderEmail({ provider: AUTH_PROVIDER.telegram, id: 42 }), accounts: [] })
    );

    await expect(service.unlink('u1')).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.telegramAccount.deleteMany).not.toHaveBeenCalled();
  });

  it('unlinks a placeholder account that signs in another way', async () => {
    const { service, prisma } = createService();

    prisma.user.findUniqueOrThrow.mockResolvedValue(
      userWith({ email: placeholderEmail({ provider: AUTH_PROVIDER.telegram, id: 42 }), accounts: [{ id: 'lesta' }] })
    );

    await service.unlink('u1');

    expect(prisma.telegramAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(prisma.account.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', providerId: AUTH_PROVIDER.telegram } });
  });

  it('unlinks an account with a real e-mail even without another provider', async () => {
    const { service, prisma } = createService();

    prisma.user.findUniqueOrThrow.mockResolvedValue(userWith({ email: 'real@example.com', accounts: [] }));

    await service.unlink('u1');

    expect(prisma.telegramAccount.deleteMany).toHaveBeenCalledOnce();
  });
});

describe('TelegramLinkWriterService.issueWebLogin', () => {
  it('returns a site link carrying a fresh single-purpose code', async () => {
    const { service, prisma, config } = createService();

    config.get.mockReturnValue('https://triotmetki.ru');

    const url = new URL(await service.issueWebLogin('u1'));
    const code = url.searchParams.get('code');

    expect(url.origin + url.pathname).toBe(`https://triotmetki.ru${WEB_LOGIN.path}`);
    expect(code).toMatch(/^[\w-]{43}$/);
    expect(prisma.oneTimeCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', purpose: 'telegramWebLogin' } });

    expect(prisma.oneTimeCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ code, purpose: 'telegramWebLogin', userId: 'u1' })
    });
  });
});
