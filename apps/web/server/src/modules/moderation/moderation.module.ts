import { Module } from '@nestjs/common';

import { ModerationController } from './moderation.controller';
import { ModerationWriterService } from './services/moderation-writer.service';

@Module({
  controllers: [ModerationController],
  providers: [ModerationWriterService]
})
export class ModerationModule {}
