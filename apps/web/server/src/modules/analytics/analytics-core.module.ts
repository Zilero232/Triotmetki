import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { ReferenceCoreModule } from '../reference';
import { FirstWinReaderService, OwnAccountReaderService } from './services';

@Module({
  imports: [AccountsModule, ReferenceCoreModule],
  providers: [OwnAccountReaderService, FirstWinReaderService],
  exports: [OwnAccountReaderService, FirstWinReaderService]
})
export class AnalyticsCoreModule {}
