import { Module } from '@nestjs/common';

import { ChallengeWriterService } from './services/challenge-writer.service';

@Module({
  providers: [ChallengeWriterService],
  exports: [ChallengeWriterService]
})
export class StreamerChallengesModule {}
