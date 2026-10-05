import { Inject, Injectable, Logger } from '@nestjs/common';
import { addDays, fromUnixTime } from 'date-fns';

import type { LestaClients } from '../../../core';
import type { MarkStaleInput, TokenRenewalResult } from '../lesta-links.types';

import { errorMessage } from '../../../common/lib';
import { LESTA_CLIENTS, PrismaService, TokenCipherService } from '../../../core';
import { NotificationService } from '../../notifications';
import { LESTA_LINKS } from '../config';
import { hasExpired, isTokenRejected, relinkDedupeKey, renewedExpiry } from '../lib';

@Injectable()
export class TokenRenewalService {
  private readonly logger = new Logger(TokenRenewalService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    private readonly notifications: NotificationService,
    private readonly cipher: TokenCipherService
  ) {}

  async run(now = new Date()): Promise<TokenRenewalResult> {
    const due = await this.prisma.userLestaAccount.findMany({
      where: { accessToken: { not: null }, tokenStaleAt: null, tokenExpiresAt: { lte: addDays(now, LESTA_LINKS.token.renewWithinDays) } },
      orderBy: { tokenExpiresAt: 'asc' },
      take: LESTA_LINKS.token.batch,
      select: { userId: true, accountId: true, accessToken: true, tokenExpiresAt: true, player: { select: { nickname: true } } }
    });

    const result: TokenRenewalResult = { due: due.length, renewed: 0, stale: 0, failed: 0 };

    for (const link of due) {
      if (!link.accessToken) {
        continue;
      }

      try {
        const accessToken = await this.cipher.open(link.accessToken);
        const renewed = await this.clients.priority.auth.prolongate({ accessToken, expiresAt: renewedExpiry(now) });

        await this.prisma.userLestaAccount.update({
          where: { accountId: link.accountId },
          data: { accessToken: await this.cipher.seal(renewed.access_token), tokenExpiresAt: fromUnixTime(renewed.expires_at) }
        });

        result.renewed += 1;
      } catch (error) {
        if (isTokenRejected(error) || hasExpired({ expiresAt: link.tokenExpiresAt, now })) {
          await this.markStale({ link, now });
          result.stale += 1;

          continue;
        }

        result.failed += 1;
        this.logger.warn(`token of ${link.accountId} not renewed, retrying tomorrow: ${errorMessage(error)}`);
      }
    }

    return result;
  }

  private async markStale({ link, now }: MarkStaleInput): Promise<void> {
    await this.prisma.userLestaAccount.update({ where: { accountId: link.accountId }, data: { tokenStaleAt: now, accessToken: null } });

    await this.notifications.notify({
      userId: link.userId,
      notification: { event: 'lestaRelinkRequired', accountId: Number(link.accountId), nickname: link.player.nickname },
      dedupeKey: relinkDedupeKey({ accountId: link.accountId, expiresAt: link.tokenExpiresAt })
    });
  }
}
