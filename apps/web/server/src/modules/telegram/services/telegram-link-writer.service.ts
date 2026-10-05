import type { TelegramLinkCode, TelegramStatus } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { randomBytes } from 'node:crypto';

import type { ConsumeLinkCodeInput, LinkCodePreview, TxUserInput } from '../telegram.types';

import { AppBadRequestException, AppConflictException } from '../../../common/exceptions';
import { randomCode } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { AUTH_PROVIDER, isPlaceholderEmail } from '../../../lib/auth';
import { siteUrl } from '../../bot-commands';
import { CommunityContentWriterService } from '../../community-core';
import { LINK_CODE } from '../config/link-code.constants';
import { SETTINGS_MENU } from '../config/settings-menu.constants';
import { WEB_LOGIN } from '../config/web-login.constants';
import { normaliseLinkCode } from '../lib/link-code/link-code';
import { DISPOSABLE_USER_COUNTS } from '../selects/disposable-user.selects';
import { TelegramIdentityWriterService } from './telegram-identity-writer.service';

@Injectable()
export class TelegramLinkWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly identity: TelegramIdentityWriterService,
    private readonly communityContent: CommunityContentWriterService
  ) {}

  async issueCode(userId: string): Promise<TelegramLinkCode> {
    const code = randomCode(LINK_CODE);
    const expiresAt = addMinutes(new Date(), LINK_CODE.ttlMinutes);
    const botUsername = this.config.get('TELEGRAM_BOT_USERNAME');

    await this.prisma.$transaction([
      this.prisma.oneTimeCode.deleteMany({ where: { userId, purpose: 'telegramLink' } }),
      this.prisma.oneTimeCode.create({ data: { code, purpose: 'telegramLink', userId, expiresAt } })
    ]);

    return { code, expiresAt: expiresAt.toISOString(), deepLink: botUsername ? `https://t.me/${botUsername}?start=${code}` : null };
  }

  async previewCode(code: string): Promise<LinkCodePreview | null> {
    const normalised = normaliseLinkCode(code);
    const row = await this.prisma.oneTimeCode.findFirst({
      where: { code: normalised, purpose: 'telegramLink', usedAt: null, expiresAt: { gt: new Date() } },
      select: { user: { select: { name: true } } }
    });

    return row ? { code: normalised, accountName: row.user.name } : null;
  }

  async consumeCode({ code, identity }: ConsumeLinkCodeInput): Promise<string> {
    const normalised = normaliseLinkCode(code);
    const { telegramId, username, languageCode } = identity;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.oneTimeCode.updateMany({
        where: { code: normalised, purpose: 'telegramLink', usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() }
      });

      if (claimed.count === 0) {
        throw new AppBadRequestException('VALIDATION_FAILED', 'The link code is unknown, already used or expired');
      }

      const { userId } = await tx.oneTimeCode.findUniqueOrThrow({ where: { code: normalised }, select: { userId: true } });
      const taken = await tx.telegramAccount.findUnique({ where: { telegramId }, select: { userId: true } });

      if (taken && taken.userId !== userId) {
        if (!(await this.isDisposable({ tx, userId: taken.userId }))) {
          throw new AppConflictException('CONFLICT', 'This Telegram account is linked to another user');
        }

        await this.communityContent.purgeAuthoredBy({ userId: taken.userId, db: tx });
        await tx.user.delete({ where: { id: taken.userId } });
      }

      await tx.telegramAccount.deleteMany({ where: { userId, NOT: { telegramId } } });

      await tx.telegramAccount.upsert({
        where: { telegramId },
        create: { userId, telegramId, username, languageCode, lastSeenAt: new Date() },
        update: { userId, username, languageCode, lastSeenAt: new Date() }
      });

      await tx.account.deleteMany({ where: { userId, providerId: AUTH_PROVIDER.telegram, NOT: { accountId: String(telegramId) } } });

      await tx.account.upsert({
        where: { providerId_accountId: { providerId: AUTH_PROVIDER.telegram, accountId: String(telegramId) } },
        create: { userId, providerId: AUTH_PROVIDER.telegram, accountId: String(telegramId) },
        update: { userId }
      });

      await this.enableTelegramChannel({ tx, userId });

      return userId;
    });
  }

  async status(userId: string): Promise<TelegramStatus> {
    const account = await this.prisma.telegramAccount.findUnique({ where: { userId }, select: { username: true } });

    return {
      isLinked: account !== null,
      username: account?.username ?? null,
      botUsername: this.config.get('TELEGRAM_BOT_USERNAME') || null
    };
  }

  async unlink(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, accounts: { where: { NOT: { providerId: AUTH_PROVIDER.telegram } }, select: { id: true } } }
    });

    if (user.accounts.length === 0 && isPlaceholderEmail(user.email)) {
      throw new AppConflictException('CONFLICT', 'Telegram is the only way into this account');
    }

    await this.prisma.$transaction([
      this.prisma.telegramAccount.deleteMany({ where: { userId } }),
      this.prisma.account.deleteMany({ where: { userId, providerId: AUTH_PROVIDER.telegram } })
    ]);
  }

  async issueWebLogin(userId: string): Promise<string> {
    const code = randomBytes(WEB_LOGIN.bytes).toString('base64url');
    const expiresAt = addMinutes(new Date(), WEB_LOGIN.ttlMinutes);

    await this.prisma.$transaction([
      this.prisma.oneTimeCode.deleteMany({ where: { userId, purpose: 'telegramWebLogin' } }),
      this.prisma.oneTimeCode.create({ data: { code, purpose: 'telegramWebLogin', userId, expiresAt } })
    ]);

    const url = new URL(siteUrl({ webUrl: this.config.get('WEB_URL'), path: WEB_LOGIN.path }));

    url.searchParams.set('code', code);

    return url.href;
  }

  async redeemWebLogin(code: string): Promise<string> {
    const claimed = await this.prisma.oneTimeCode.updateMany({
      where: { code, purpose: 'telegramWebLogin', usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() }
    });

    if (claimed.count === 0) {
      throw new AppBadRequestException('UNAUTHORIZED', 'The sign-in link is unknown, already used or expired');
    }

    const { userId } = await this.prisma.oneTimeCode.findUniqueOrThrow({ where: { code }, select: { userId: true } });

    return this.identity.issueSessionToken(userId);
  }

  private async isDisposable({ tx, userId }: TxUserInput): Promise<boolean> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        accounts: { where: { NOT: { providerId: AUTH_PROVIDER.telegram } }, select: { id: true } },
        streamerProfile: { select: { id: true } },
        settingsShare: { select: { userId: true } },
        coachProfile: { select: { userId: true } },
        referredBy: { select: { referredUserId: true } },
        _count: { select: DISPOSABLE_USER_COUNTS }
      }
    });

    if (!user || !isPlaceholderEmail(user.email)) {
      return false;
    }

    const holdsOneToOne = [user.streamerProfile, user.settingsShare, user.coachProfile, user.referredBy].some((row) => row !== null);

    return user.accounts.length === 0 && !holdsOneToOne && Object.values(user._count).every((count) => count === 0);
  }

  private async enableTelegramChannel({ tx, userId }: TxUserInput): Promise<void> {
    const settings = await tx.notificationSettings.findUnique({ where: { userId }, select: { channels: true } });

    if (settings?.channels.includes('telegram')) {
      return;
    }

    await tx.notificationSettings.upsert({
      where: { userId },
      create: { userId, channels: [...SETTINGS_MENU.defaultChannels, 'telegram'], events: [...SETTINGS_MENU.defaultEvents] },
      update: { channels: { push: 'telegram' } }
    });
  }
}
