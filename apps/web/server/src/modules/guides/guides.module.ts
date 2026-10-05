import { Module } from '@nestjs/common';

import { CommentsController } from './comments.controller';
import { GuidesController } from './guides.controller';
import { CommentWriterService } from './services/comment-writer.service';
import { GuideWriterService } from './services/guide-writer.service';

@Module({
  controllers: [GuidesController, CommentsController],
  providers: [GuideWriterService, CommentWriterService]
})
export class GuidesModule {}
