import { Module } from '@nestjs/common';

import { BoardLiveService } from './services/board-live.service';
import { CollabRedisService } from './services/collab-redis.service';
import { TacticBoardWriterService } from './services/tactic-board-writer.service';
import { TacticsCollabService } from './services/tactics-collab.service';
import { TacticsController } from './tactics.controller';

@Module({
  controllers: [TacticsController],
  providers: [BoardLiveService, CollabRedisService, TacticBoardWriterService, TacticsCollabService]
})
export class TacticsModule {}
