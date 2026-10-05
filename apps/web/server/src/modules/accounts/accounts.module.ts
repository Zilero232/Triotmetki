import { Module } from '@nestjs/common';

import { UserAccountsReaderService } from './services/user-accounts-reader.service';

@Module({
  providers: [UserAccountsReaderService],
  exports: [UserAccountsReaderService]
})
export class AccountsModule {}
