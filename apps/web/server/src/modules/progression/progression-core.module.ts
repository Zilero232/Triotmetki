import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { CosmeticsReaderService } from './services/cosmetics-reader.service';
import { ShellLedgerWriterService } from './services/shell-ledger-writer.service';

@Module({
  imports: [BillingCoreModule],
  providers: [ShellLedgerWriterService, CosmeticsReaderService],
  exports: [ShellLedgerWriterService, CosmeticsReaderService]
})
export class ProgressionCoreModule {}
