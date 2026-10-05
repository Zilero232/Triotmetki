import { Module } from '@nestjs/common';

import { TokenCipherModule } from '../../core';
import { AccountsModule } from '../accounts';
import { BillingCoreModule } from '../billing';
import { PurgeGuardModule } from '../collector';
import { CommunityCoreModule } from '../community-core';
import { AccountPurgeService, LestaAccountsService, TelegramAccountsService } from './services';

@Module({
  imports: [AccountsModule, BillingCoreModule, CommunityCoreModule, PurgeGuardModule, TokenCipherModule],
  providers: [LestaAccountsService, TelegramAccountsService, AccountPurgeService],
  exports: [LestaAccountsService, TelegramAccountsService, AccountPurgeService]
})
export class AuthStoresModule {}
