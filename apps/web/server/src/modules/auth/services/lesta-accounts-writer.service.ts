import { Inject, Injectable, Logger } from '@nestjs/common';

import type { LestaAccountStore, LinkLestaAccountInput } from '../../../lib/auth';
import type { LestaClient } from '../../../lib/lesta';

import { errorMessage } from '../../../common/lib';
import { LESTA_CLIENT, LIMIT_LOCK_SCOPE, lockedTransaction, PrismaService, TokenCipherService } from '../../../core';
import { UserAccountsReaderService } from '../../accounts';
import { EntitlementsService } from '../../billing';
import { CollectorProducerService, PurgeGuardService } from '../../collector';

@Injectable()
export class LestaAccountsWriterService implements LestaAccountStore {
  private readonly logger = new Logger(LestaAccountsWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collector: CollectorProducerService,
    private readonly entitlements: EntitlementsService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient,
    private readonly cipher: TokenCipherService,
    private readonly purgeGuard: PurgeGuardService,
    private readonly accounts: UserAccountsReaderService
  ) {}

  async findUserId(accountId: number): Promise<string | null> {
    const link = await this.prisma.userLestaAccount.findUnique({ where: { accountId: BigInt(accountId) }, select: { userId: true } });

    return link?.userId ?? null;
  }

  async primaryAccountId(userId: string): Promise<number | null> {
    const accountId = await this.accounts.primaryAccountId(userId);

    return accountId === null ? null : Number(accountId);
  }

  async link({ userId, accountId, nickname, accessToken, expiresAt }: LinkLestaAccountInput): Promise<boolean> {
    const id = BigInt(accountId);
    const limit = await this.entitlements.limit({ userId, key: 'linkedAccounts' });
    const sealedToken = await this.cipher.seal(accessToken);

    const { isLinked, isCleared } = await lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.linkedAccounts,
      key: userId,
      run: async (tx) => {
        const others = await tx.userLestaAccount.count({ where: { userId, NOT: { accountId: id } } });
        const isKnown = (await tx.userLestaAccount.count({ where: { userId, accountId: id } })) > 0;

        if (!isKnown && others >= limit) {
          return { isLinked: false, isCleared: false };
        }

        const isAccountCleared = await this.purgeGuard.liftUserRequests({ db: tx, accountId: id });

        await tx.player.upsert({
          where: { accountId: id },
          create: isAccountCleared
            ? { accountId: id, nickname, trackingTier: 'active', isHidden: false }
            : { accountId: id, nickname, isHidden: true },
          update: isAccountCleared ? { nickname, trackingTier: 'active', isHidden: false } : { isHidden: true }
        });

        if (isAccountCleared) {
          await tx.playerNickname.upsert({
            where: { accountId_nickname: { accountId: id, nickname } },
            create: { accountId: id, nickname },
            update: { lastSeenAt: new Date() }
          });
        }

        const hasPrimary = await tx.userLestaAccount.count({ where: { userId, isPrimary: true, NOT: { accountId: id } } });

        await tx.userLestaAccount.upsert({
          where: { accountId: id },
          create: { userId, accountId: id, accessToken: sealedToken, tokenExpiresAt: expiresAt, isPrimary: hasPrimary === 0 },
          update: { userId, accessToken: sealedToken, tokenExpiresAt: expiresAt, tokenStaleAt: null, garageSyncedAt: null }
        });

        return { isLinked: true, isCleared: isAccountCleared };
      }
    });

    if (isLinked) {
      this.entitlements.invalidate(userId);
    }

    if (isCleared) {
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
