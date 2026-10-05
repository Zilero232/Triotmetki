import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../../billing';
import { StreamerLiveModule } from '../live';
import { ClaimTransferWriterService } from './services/claim-transfer-writer.service';
import { StreamerCardsService } from './services/streamer-cards.service';
import { StreamerClaimService } from './services/streamer-claim.service';
import { StreamerDirectoryService } from './services/streamer-directory.service';
import { StreamerFollowService } from './services/streamer-follow.service';
import { StreamerInvitationService } from './services/streamer-invitation.service';
import { StreamerModerationService } from './services/streamer-moderation.service';
import { StreamerProfileService } from './services/streamer-profile.service';

@Module({
  imports: [BillingCoreModule, StreamerLiveModule],
  providers: [
    StreamerProfileService,
    StreamerCardsService,
    StreamerDirectoryService,
    StreamerClaimService,
    ClaimTransferWriterService,
    StreamerInvitationService,
    StreamerModerationService,
    StreamerFollowService
  ],
  exports: [
    StreamerProfileService,
    StreamerDirectoryService,
    StreamerClaimService,
    StreamerInvitationService,
    StreamerModerationService,
    StreamerFollowService
  ]
})
export class StreamerProfilesModule {}
