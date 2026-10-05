import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { BillingCoreModule } from '../billing';
import { MarksModule } from '../marks';
import { UsageModule } from '../usage';
import { MyTanksController } from './my-tanks.controller';
import { armorStorageProvider } from './providers';
import { tanksQueriesProvider } from './providers/tanks-queries.provider';
import {
  MyTankInsightsReaderService,
  TankArmorReaderService,
  TankDetailReaderService,
  TankDifficultyReaderService,
  TankEconomyReaderService,
  TankLearningReaderService,
  TankObtainReaderService,
  TankPatchesReaderService,
  TankStatsReaderService,
  TankTraitsReaderService,
  TankTrendReaderService,
  TierListReaderService,
  TopPlayersReaderService,
  VehicleSourcesService,
  VehiclesReaderService
} from './services';
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
