import { Inject, Injectable, Logger } from '@nestjs/common';

import type { LestaAccountStore, LinkLestaAccountInput } from '../../../lib/auth';
import type { LestaClient } from '../../../lib/lesta';

import { errorMessage } from '../../../common/lib';
import { LESTA_CLIENT, LIMIT_LOCK_SCOPE, lockedTransaction, PrismaService, TokenCipherService, USER_LESTA_ACCOUNT_ORDER } from '../../../core';
import { EntitlementsService } from '../../billing';
import { CollectorProducerService } from '../../collector';

@Injectable()
export class LestaAccountsService implements LestaAccountStore {
  private readonly logger = new Logger(LestaAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collector: CollectorProducerService,
    private readonly entitlements: EntitlementsService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient,
    private readonly cipher: TokenCipherService
  ) {}

  async findUserId(accountId: number): Promise<string | null> {
    const link = await this.prisma.userLestaAccount.findUnique({ where: { accountId: BigInt(accountId) }, select: { userId: true } });

    return link?.userId ?? null;
  }

  async primaryAccountId(userId: string): Promise<number | null> {
    const link = await this.prisma.userLestaAccount.findFirst({
      where: { userId },
      orderBy: USER_LESTA_ACCOUNT_ORDER,
      select: { accountId: true }
    });

    return link ? Number(link.accountId) : null;
  }

  async link({ userId, accountId, nickname, accessToken, expiresAt }: LinkLestaAccountInput): Promise<boolean> {
    const id = BigInt(accountId);
    const limit = await this.entitlements.limit({ userId, key: 'linkedAccounts' });
    const sealedToken = await this.cipher.seal(accessToken);

    const isLinked = await lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.linkedAccounts,
      key: userId,
      run: async (tx) => {
        const others = await tx.userLestaAccount.count({ where: { userId, NOT: { accountId: id } } });
        const isKnown = (await tx.userLestaAccount.count({ where: { userId, accountId: id } })) > 0;

        if (!isKnown && others >= limit) {
          return false;
        }

        await tx.player.upsert({
          where: { accountId: id },
          create: { accountId: id, nickname, trackingTier: 'active' },
          update: { nickname, trackingTier: 'active' }
        });

        await tx.playerNickname.upsert({
          where: { accountId_nickname: { accountId: id, nickname } },
          create: { accountId: id, nickname },
          update: { lastSeenAt: new Date() }
        });

        const hasPrimary = await tx.userLestaAccount.count({ where: { userId, isPrimary: true, NOT: { accountId: id } } });

        await tx.userLestaAccount.upsert({
          where: { accountId: id },
          create: { userId, accountId: id, accessToken: sealedToken, tokenExpiresAt: expiresAt, isPrimary: hasPrimary === 0 },
          update: { userId, accessToken: sealedToken, tokenExpiresAt: expiresAt, tokenStaleAt: null, garageSyncedAt: null }
        });

        return true;
      }
    });

    if (isLinked) {
      this.entitlements.invalidate(userId);
      await this.collector.enrol({ accountId, priority: 'high', reason: 'login' });
    }

    return isLinked;
  }

  async revokeTokens(userId: string): Promise<void> {
    const links = await this.prisma.userLestaAccount.findMany({ where: { userId, accessToken: { not: null } } });

    await Promise.allSettled(
      links.map(async (link) => {
        if (link.accessToken) {
          await this.lesta.auth.logout({ accessToken: await this.cipher.open(link.accessToken) }).catch((error: unknown) => {
            this.logger.warn(`Lesta token of ${link.accountId} was not revoked: ${errorMessage(error)}`);
          });
        }
      })
    );

    await this.prisma.userLestaAccount.updateMany({ where: { userId }, data: { accessToken: null, tokenExpiresAt: null } });
  }
}
