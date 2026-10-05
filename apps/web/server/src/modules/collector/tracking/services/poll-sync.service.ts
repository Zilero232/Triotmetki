import { Injectable, Logger } from '@nestjs/common';

import type { PollStorePort } from '../lib/poll-pipeline/poll-pipeline.types';
import type { PollResult, RunPipelineInput } from '../tracking.types';

import { errorMessage } from '../../../../common/lib';
import { PurgeGuardService } from '../../purge';
import { runPollPipeline } from '../lib/poll-pipeline/poll-pipeline';
import { AccountWriterService } from './account-writer.service';
import { PlayerWriterService } from './player-writer.service';
import { RatingsTriggerService } from './ratings-trigger.service';
import { TrackingLestaService } from './tracking-lesta.service';

@Injectable()
export class PollSyncService {
  private readonly logger = new Logger(PollSyncService.name);

  constructor(
    private readonly lesta: TrackingLestaService,
    private readonly players: PlayerWriterService,
    private readonly accounts: AccountWriterService,
    private readonly guard: PurgeGuardService,
    private readonly ratings: RatingsTriggerService
  ) {}

  async run({ accountIds, lane, tier, promote = false }: RunPipelineInput): Promise<PollResult> {
    const result = await runPollPipeline({
      ports: {
        lesta: this.lesta.port(lane),
        store: this.store(),
        onError: ({ accountId, error }) => this.logger.warn(`account ${accountId} failed: ${errorMessage(error)}`)
      },
      accountIds,
      tier,
      promote
    });

    await this.ratings.request(result.updated);

    if (result.failed.length > 0 && result.updated.length + result.unchanged.length === 0) {
      throw new Error(`every account in the batch failed (${result.failed.length})`);
    }

    return result;
  }

  private store(): PollStorePort {
    return {
      blockedAccounts: async (accountIds) => this.guard.blocked(accountIds),
      loadPlayers: async (accountIds) => this.players.loadPlayers(accountIds),
      upsertPlayers: async (entries) => this.players.upsertPlayers(entries),
      markSynced: async (entries) => this.players.markSynced(entries),
      markMissing: async (accountIds) => this.players.markMissing(accountIds),
      loadBaselines: async (accountIds) => this.accounts.loadBaselines(accountIds),
      overallWn8: async (accountId) => this.accounts.overallWn8(accountId),
      withAccount: async (input) => this.accounts.withAccount(input)
    };
  }
}
