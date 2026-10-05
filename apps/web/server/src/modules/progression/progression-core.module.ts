import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { CosmeticsService } from './services/cosmetics.service';
import { ShellLedgerWriterService } from './services/shell-ledger-writer.service';

@Module({
  imports: [BillingCoreModule],
  providers: [ShellLedgerWriterService, CosmeticsService],
  exports: [ShellLedgerWriterService, CosmeticsService]
})
export class ProgressionCoreModule {}
