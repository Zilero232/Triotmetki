import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';

import type { TelegramIdentity } from '../telegram.types';

import { PrismaService } from '../../../core';
import { AUTH_PROVIDER, placeholderEmail } from '../../../lib/auth';

@Injectable()
export class TelegramIdentityWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService
  ) {}

  async ensureUser(identity: TelegramIdentity): Promise<string> {
    const { telegramId, username, name, languageCode } = identity;
    const existing = await this.prisma.telegramAccount.findUnique({ where: { telegramId }, select: { userId: true } });

    if (existing) {
      return existing.userId;
    }

    const { internalAdapter } = await this.auth.instance.$context;
    const user = await internalAdapter.createUser(
      { name, email: placeholderEmail({ provider: AUTH_PROVIDER.telegram, id: telegramId }), emailVerified: false },
      { method: AUTH_PROVIDER.telegram }
    );

    await internalAdapter.createAccount({ userId: user.id, providerId: AUTH_PROVIDER.telegram, accountId: String(telegramId) });
    await this.prisma.telegramAccount.create({ data: { userId: user.id, telegramId, username, languageCode, lastSeenAt: new Date() } });

    return user.id;
  }

  async issueSessionToken(userId: string): Promise<string> {
    const { internalAdapter } = await this.auth.instance.$context;
    const session = await internalAdapter.createSession(userId);

    return session.token;
  }
}
