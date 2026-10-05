import { Injectable } from '@nestjs/common';

import type { AccountInput } from '../analytics.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { UserAccountsReaderService } from '../../accounts';

@Injectable()
export class OwnAccountReaderService {
  constructor(private readonly lestaAccounts: UserAccountsReaderService) {}

  async accountIds(userId: string): Promise<bigint[]> {
    return this.lestaAccounts.accountIds(userId);
  }

  async find({ userId, account }: AccountInput): Promise<bigint | null> {
    const ids = await this.accountIds(userId);

    if (account === undefined) {
      return ids[0] ?? null;
    }

    return ids.find((id) => id === BigInt(account)) ?? null;
  }

  async resolve(input: AccountInput): Promise<bigint> {
    const accountId = await this.find(input);

    if (accountId === null) {
      throw new AppNotFoundException('NOT_FOUND', 'Link your Lesta account to see your analytics');
    }

    return accountId;
  }
}
