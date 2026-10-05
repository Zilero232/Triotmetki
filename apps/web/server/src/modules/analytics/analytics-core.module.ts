import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { ReferenceCoreModule } from '../reference';
import { FirstWinReaderService } from './services/first-win-reader.service';
import { OwnAccountReaderService } from './services/own-account-reader.service';

@Module({
  imports: [AccountsModule, ReferenceCoreModule],
  providers: [OwnAccountReaderService, FirstWinReaderService],
  exports: [OwnAccountReaderService, FirstWinReaderService]
})
export class AnalyticsCoreModule {}
