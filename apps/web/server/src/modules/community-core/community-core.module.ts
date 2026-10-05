import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { CommunityAccountsReaderService } from './services/community-accounts-reader.service';
import { CommunityContentWriterService } from './services/community-content-writer.service';

@Module({
  imports: [AccountsModule],
  providers: [CommunityAccountsReaderService, CommunityContentWriterService],
  exports: [CommunityAccountsReaderService, CommunityContentWriterService]
})
export class CommunityCoreModule {}
