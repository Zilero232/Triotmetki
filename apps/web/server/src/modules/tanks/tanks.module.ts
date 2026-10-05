import { Module } from '@nestjs/common';

import { UserLestaAccountsModule } from '../../core';
import { BillingCoreModule } from '../billing';
import { MarksModule } from '../marks';
import { UsageModule } from '../usage';
import { MyTanksController } from './my-tanks.controller';
import { armorStorageProvider } from './providers';
import { tanksQueriesProvider } from './providers/tanks-queries.provider';
import {
  MyTankInsightsReaderService,
  TankArmorReaderService,
  TankDetailService,
  TankDifficultyService,
  TankEconomyReaderService,
  TankLearningReaderService,
  TankObtainReaderService,
  TankPatchesReaderService,
  TankStatsService,
  TankTraitsReaderService,
  TankTrendReaderService,
  TierListService,
  TopPlayersReaderService,
  VehicleSourcesService,
  VehiclesReaderService
} from './services';
import { TankArmorController } from './tank-armor.controller';
import { TanksController } from './tanks.controller';
import { VehicleSourcesController } from './vehicle-sources.controller';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [UserLestaAccountsModule, MarksModule, BillingCoreModule, UsageModule],
  controllers: [TanksController, TankArmorController, MyTanksController, VehiclesController, VehicleSourcesController],
  providers: [
    armorStorageProvider,
    tanksQueriesProvider,
    TankArmorReaderService,
    TankStatsService,
    TierListService,
    TankDetailService,
    TankDifficultyService,
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
  exports: [TankDetailService, TankDifficultyService, TankStatsService, TierListService]
})
export class TanksModule {}
