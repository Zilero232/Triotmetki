import { Injectable } from '@nestjs/common';

import type { RequirePrimaryInput } from '../accounts.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { USER_LESTA_ACCOUNT_ORDER } from '../config/accounts.constants';

@Injectable()
export class UserAccountsReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async accountIds(userId: string): Promise<bigint[]> {
    const links = await this.prisma.userLestaAccount.findMany({ where: { userId }, orderBy: USER_LESTA_ACCOUNT_ORDER, select: { accountId: true } });

    return links.map((link) => link.accountId);
  }

  async primaryAccountId(userId: string): Promise<bigint | null> {
    const link = await this.prisma.userLestaAccount.findFirst({ where: { userId }, orderBy: USER_LESTA_ACCOUNT_ORDER, select: { accountId: true } });

    return link?.accountId ?? null;
  }

  async requirePrimaryAccountId({ userId, message }: RequirePrimaryInput): Promise<bigint> {
    const accountId = await this.primaryAccountId(userId);

    if (accountId === null) {
      throw new AppNotFoundException('NOT_FOUND', message);
    }

    return accountId;
  }
}
