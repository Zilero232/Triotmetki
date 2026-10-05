import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import {
  TankDetailDto,
  TankDetailQueryDto,
  TankEconomyDto,
  TankEconomyPageDto,
  TankEconomyQueryDto,
  TankLookupParamsDto,
  TankParamsDto,
  TankPatchesDto,
  TankStatsPageDto,
  TankStatsQueryDto,
  TankTrendDto,
  TankTrendQueryDto,
  TierListDto,
  TierListQueryDto,
  TopPlayersDto,
  TopPlayersQueryDto
} from './dto';
import {
  TankDetailService,
  TankEconomyReaderService,
  TankPatchesReaderService,
  TankStatsService,
  TankTrendReaderService,
  TierListService,
  TopPlayersReaderService
} from './services';

@ApiTags('tanks')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('tanks')
export class TanksController {
  constructor(
    private readonly stats: TankStatsService,
    private readonly tierLists: TierListService,
    private readonly details: TankDetailService,
    private readonly topPlayers: TopPlayersReaderService,
    private readonly trends: TankTrendReaderService,
    private readonly patchNotes: TankPatchesReaderService,
    private readonly economy: TankEconomyReaderService
  ) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TankStatsPageDto })
  list(@Query() query: TankStatsQueryDto) {
    return this.stats.list(query);
  }

  @Get('tier-list')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TierListDto })
  tierList(@Query() query: TierListQueryDto) {
    return this.tierLists.tierList(query);
  }

  @Get('economy')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TankEconomyPageDto })
  economyTable(@Query() query: TankEconomyQueryDto) {
    return this.economy.list(query);
  }

  @Get(':id/economy')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TankEconomyDto })
  async tankEconomy(@Param() { id }: TankParamsDto) {
    return this.economy.forTank(await this.details.resolve(String(id)));
  }

  @Get(':id/top-players')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TopPlayersDto })
  async top(@Param() { id }: TankParamsDto, @Query() query: TopPlayersQueryDto) {
    const tankId = await this.details.resolve(String(id));

    return this.topPlayers.top({ tankId, query });
  }

  @Get(':id/trend')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TankTrendDto })
  async trend(@Param() { id }: TankParamsDto, @Query() query: TankTrendQueryDto) {
    const tankId = await this.details.resolve(String(id));

    return this.trends.trend({ tankId, query });
  }

  @Get(':id/patches')
  @CacheTTL(CACHE_TTL.reference)
  @ZodResponse({ type: TankPatchesDto })
  async patches(@Param() { id }: TankParamsDto) {
    const tankId = await this.details.resolve(String(id));

    return this.patchNotes.patches(tankId);
  }

  @Get(':idOrSlug')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TankDetailDto })
  detail(@Param() { idOrSlug }: TankLookupParamsDto, @Query() query: TankDetailQueryDto) {
    return this.details.detail({ idOrSlug, query });
  }
}
