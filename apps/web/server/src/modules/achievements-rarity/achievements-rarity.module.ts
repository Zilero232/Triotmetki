import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { AchievementsRarityController } from './achievements-rarity.controller';
import { AchievementCatalogReaderService } from './services/achievement-catalog-reader.service';
import { CollectorsReaderService } from './services/collectors-reader.service';
import { TankRarityReaderService } from './services/tank-rarity-reader.service';

@Module({
  imports: [BillingCoreModule],
  controllers: [AchievementsRarityController],
  providers: [AchievementCatalogReaderService, TankRarityReaderService, CollectorsReaderService]
})
export class AchievementsRarityModule {}
