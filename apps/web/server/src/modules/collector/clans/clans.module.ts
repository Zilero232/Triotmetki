import { Module } from '@nestjs/common';

import { PurgeModule } from '../purge';
import { ClansProcessor } from './processors/clans.processor';
import { clansQueriesProvider } from './providers/clans-queries.provider';
import { ClanDispatchService } from './services/clan-dispatch.service';
import { ClanHistorySyncService } from './services/clan-history-sync.service';
import { ClanSnapshotSyncService } from './services/clan-snapshot-sync.service';
import { ClanSyncService } from './services/clan-sync.service';

@Module({
  imports: [PurgeModule],
  providers: [clansQueriesProvider, ClanDispatchService, ClanSyncService, ClanSnapshotSyncService, ClanHistorySyncService, ClansProcessor]
})
export class ClansModule {}
