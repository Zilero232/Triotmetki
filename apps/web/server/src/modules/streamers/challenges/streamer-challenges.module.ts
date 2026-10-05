import { Module } from '@nestjs/common';

import { ChallengeService } from './services/challenge.service';

@Module({
  providers: [ChallengeService],
  exports: [ChallengeService]
})
export class StreamerChallengesModule {}
