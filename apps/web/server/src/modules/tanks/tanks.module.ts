import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { BillingCoreModule } from '../billing';
import { MarksModule } from '../marks';
import { UsageModule } from '../usage';
import { MyTanksController } from './my-tanks.controller';
import { armorStorageProvider } from './providers/armor-storage.provider';
import { tanksQueriesProvider } from './providers/tanks-queries.provider';
import { MyTankInsightsReaderService } from './services/my-tank-insights-reader.service';
import { TankArmorReaderService } from './services/tank-armor-reader.service';
import { TankDetailReaderService } from './services/tank-detail-reader.service';
import { TankDifficultyReaderService } from './services/tank-difficulty-reader.service';
import { TankEconomyReaderService } from './services/tank-economy-reader.service';
import { TankLearningReaderService } from './services/tank-learning-reader.service';
import { TankObtainReaderService } from './services/tank-obtain-reader.service';
import { TankPatchesReaderService } from './services/tank-patches-reader.service';
import { TankStatsReaderService } from './services/tank-stats-reader.service';
import { TankTraitsReaderService } from './services/tank-traits-reader.service';
import { TankTrendReaderService } from './services/tank-trend-reader.service';
import { TierListReaderService } from './services/tier-list-reader.service';
import { TopPlayersReaderService } from './services/top-players-reader.service';
import { VehicleSourcesService } from './services/vehicle-sources.service';
import { VehiclesReaderService } from './services/vehicles-reader.service';
import { TankArmorController } from './tank-armor.controller';
import { TanksController } from './tanks.controller';
import { VehicleSourcesController } from './vehicle-sources.controller';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [AccountsModule, MarksModule, BillingCoreModule, UsageModule],
  controllers: [TanksController, TankArmorController, MyTanksController, VehiclesController, VehicleSourcesController],
  providers: [
    armorStorageProvider,
    tanksQueriesProvider,
    TankArmorReaderService,
    TankStatsReaderService,
    TierListReaderService,
    TankDetailReaderService,
    TankDifficultyReaderService,
    TopPlayersReaderService,
    TankTrendReaderService,
    TankPatchesReaderService,
    VehiclesReaderService,
    TankTraitsReaderService,
    TankObtainReaderService,
    TankEconomyReaderService,
    TankLearningReaderService,
    MyTankInsightsReaderService,
    VehicleSourcesService
  ],
  exports: [TankDetailReaderService, TankDifficultyReaderService, TankStatsReaderService, TierListReaderService]
})
export class TanksModule {}
