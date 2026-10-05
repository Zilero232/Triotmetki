import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../../billing';
import { StreamerLiveModule } from '../live';
import { ClaimTransferWriterService } from './services/claim-transfer-writer.service';
import { StreamerCardsReaderService } from './services/streamer-cards-reader.service';
import { StreamerClaimWriterService } from './services/streamer-claim-writer.service';
import { StreamerDirectoryReaderService } from './services/streamer-directory-reader.service';
import { StreamerFollowWriterService } from './services/streamer-follow-writer.service';
import { StreamerInvitationWriterService } from './services/streamer-invitation-writer.service';
import { StreamerModerationWriterService } from './services/streamer-moderation-writer.service';
import { StreamerProfileWriterService } from './services/streamer-profile-writer.service';

@Module({
  imports: [BillingCoreModule, StreamerLiveModule],
  providers: [
    StreamerProfileWriterService,
    StreamerCardsReaderService,
    StreamerDirectoryReaderService,
    StreamerClaimWriterService,
    ClaimTransferWriterService,
    StreamerInvitationWriterService,
    StreamerModerationWriterService,
    StreamerFollowWriterService
  ],
  exports: [
    StreamerProfileWriterService,
    StreamerDirectoryReaderService,
    StreamerClaimWriterService,
    StreamerInvitationWriterService,
    StreamerModerationWriterService,
    StreamerFollowWriterService
  ]
})
export class StreamerProfilesModule {}
