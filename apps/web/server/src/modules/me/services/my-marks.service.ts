import type { PlayerMarks } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { UserAccountsReaderService } from '../../accounts';
import { PlayerMarksReaderService } from '../../players';

@Injectable()
export class MyMarksService {
  constructor(
    private readonly lestaAccounts: UserAccountsReaderService,
    private readonly playerMarks: PlayerMarksReaderService
  ) {}

  async marks(userId: string): Promise<PlayerMarks> {
    const accountId = await this.lestaAccounts.requirePrimaryAccountId({ userId, message: 'Link a Lesta account to see your marks' });

    return this.playerMarks.marks(accountId);
  }
}
