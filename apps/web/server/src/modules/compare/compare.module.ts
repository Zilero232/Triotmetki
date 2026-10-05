import { Module } from '@nestjs/common';

import { PlayersModule } from '../players';
import { CompareController } from './compare.controller';
import { PlayerCompareReaderService } from './services/player-compare-reader.service';
import { TankCompareReaderService } from './services/tank-compare-reader.service';

@Module({
  imports: [PlayersModule],
  controllers: [CompareController],
  providers: [PlayerCompareReaderService, TankCompareReaderService]
})
export class CompareModule {}
