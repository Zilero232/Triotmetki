import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { CommunityAccountsService, CommunityContentService } from './services';

@Module({
  imports: [AccountsModule],
  providers: [CommunityAccountsService, CommunityContentService],
  exports: [CommunityAccountsService, CommunityContentService]
})
export class CommunityCoreModule {}
