import { Module } from '@nestjs/common';

import { TokenCipherModule } from '../../core';
import { AccountsModule } from '../accounts';
import { BillingCoreModule } from '../billing';
import { PurgeGuardModule } from '../collector';
import { CommunityCoreModule } from '../community-core';
import { AccountPurgeWriterService } from './services/account-purge-writer.service';
import { LestaAccountsWriterService } from './services/lesta-accounts-writer.service';
import { TelegramAccountsWriterService } from './services/telegram-accounts-writer.service';

@Module({
  imports: [AccountsModule, BillingCoreModule, CommunityCoreModule, PurgeGuardModule, TokenCipherModule],
  providers: [LestaAccountsWriterService, TelegramAccountsWriterService, AccountPurgeWriterService],
  exports: [LestaAccountsWriterService, TelegramAccountsWriterService, AccountPurgeWriterService]
})
export class AuthStoresModule {}
