import type { AccountEconomy, MyTankLearning } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { AccountEconomyRequest, MyLearningInput } from '../tanks.types';

import { UserLestaAccountsService } from '../../../core';
import { TankEconomyReaderService } from './tank-economy-reader.service';
import { TankLearningReaderService } from './tank-learning-reader.service';

@Injectable()
export class MyTankInsightsReaderService {
  constructor(
    private readonly lestaAccounts: UserLestaAccountsService,
    private readonly economy: TankEconomyReaderService,
    private readonly learning: TankLearningReaderService
  ) {}

  async economyOf({ userId, query }: AccountEconomyRequest): Promise<AccountEconomy> {
    const accountId = await this.lestaAccounts.requirePrimaryAccountId({ userId, message: 'Link a Lesta account to see your own tank analytics' });

    return this.economy.account({ accountId, days: query.days });
  }

  async learningOf({ userId, tankId }: MyLearningInput): Promise<MyTankLearning> {
    const accountId = await this.lestaAccounts.requirePrimaryAccountId({ userId, message: 'Link a Lesta account to see your own tank analytics' });

    return this.learning.place({ accountId, tankId });
  }
}
