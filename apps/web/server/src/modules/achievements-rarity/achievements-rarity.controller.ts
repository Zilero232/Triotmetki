import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { CacheByViewer, OptionalUserId } from '../../common/decorators';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import {
  AchievementsCatalogDto,
  AchievementsQueryDto,
  CollectionParamsDto,
  CollectorsDto,
  CollectorsQueryDto,
  PlayerCollectionDto,
  TankRarityDto,
  TankRarityQueryDto
} from './dto/achievements-rarity.dto';
import { AchievementCatalogReaderService } from './services/achievement-catalog-reader.service';
import { CollectorsReaderService } from './services/collectors-reader.service';
import { TankRarityReaderService } from './services/tank-rarity-reader.service';

@ApiTags('achievements')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('achievements')
export class AchievementsRarityController {
  constructor(
    private readonly catalog: AchievementCatalogReaderService,
    private readonly tanks: TankRarityReaderService,
    private readonly collectors: CollectorsReaderService
  ) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: AchievementsCatalogDto })
  list(@Query() query: AchievementsQueryDto) {
    return this.catalog.catalog(query);
  }

  @Get('tanks')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TankRarityDto })
  tankRarity(@Query() query: TankRarityQueryDto) {
    return this.tanks.list(query);
  }

  @Get('leaderboard')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: CollectorsDto })
  leaderboard(@Query() query: CollectorsQueryDto) {
    return this.collectors.leaderboard(query);
  }

  @Get('players/:accountId')
  @CacheTTL(CACHE_TTL.player)
  @CacheByViewer()
  @ZodResponse({ type: PlayerCollectionDto })
  player(@Param() { accountId }: CollectionParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.collectors.player({ accountId: BigInt(accountId), viewerUserId });
  }
}
