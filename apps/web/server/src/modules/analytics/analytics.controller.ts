import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { RequiresPlus } from '../billing';
import {
  AnalyticsAccountQueryDto,
  AnalyticsBattleParamsDto,
  AnalyticsBattlesQueryDto,
  AnalyticsMapsDto,
  AnalyticsOverviewDto,
  AnalyticsPlatoonsDto,
  AnalyticsQueryDto,
  AnalyticsRngDto,
  AnalyticsTankDto,
  AnalyticsTankParamsDto,
  AnalyticsTankQueryDto,
  BattleAnalysisDto,
  FirstWinDto,
  MyBattleDto,
  MyBattlesPageDto,
  PlaylistDto,
  PlaylistQueryDto
} from './dto';
import {
  AnalyticsOverviewReaderService,
  BattleReviewReaderService,
  FirstWinService,
  HonestRngReaderService,
  MapAdvisorReaderService,
  PlatoonChemistryReaderService,
  PlaylistService,
  TankAnalyticsReaderService
} from './services';

@ApiTags('me')
@Controller('me/analytics')
export class AnalyticsController {
  constructor(
    private readonly overviews: AnalyticsOverviewReaderService,
    private readonly tanks: TankAnalyticsReaderService,
    private readonly mapAdvisor: MapAdvisorReaderService,
    private readonly platoonChemistry: PlatoonChemistryReaderService,
    private readonly honestRng: HonestRngReaderService,
    private readonly battles: BattleReviewReaderService,
    private readonly playlists: PlaylistService,
    private readonly firstWins: FirstWinService
  ) {}

  @Get('overview')
  @RequiresPlus('analytics')
  @ZodResponse({ type: AnalyticsOverviewDto })
  overview(@CurrentUserId() userId: string, @Query() query: AnalyticsQueryDto) {
    return this.overviews.overview({ ...query, userId });
  }

  @Get('tanks/:tankId')
  @RequiresPlus('analytics')
  @ZodResponse({ type: AnalyticsTankDto })
  tank(@CurrentUserId() userId: string, @Param() { tankId }: AnalyticsTankParamsDto, @Query() query: AnalyticsTankQueryDto) {
    return this.tanks.tank({ ...query, userId, tankId });
  }

  @Get('maps')
  @RequiresPlus('mapAdvisor')
  @ZodResponse({ type: AnalyticsMapsDto })
  maps(@CurrentUserId() userId: string, @Query() query: AnalyticsQueryDto) {
    return this.mapAdvisor.maps({ ...query, userId });
  }

  @Get('platoons')
  @RequiresPlus('mapAdvisor')
  @ZodResponse({ type: AnalyticsPlatoonsDto })
  platoons(@CurrentUserId() userId: string, @Query() query: AnalyticsQueryDto) {
    return this.platoonChemistry.platoons({ ...query, userId });
  }

  @Get('rng')
  @RequiresPlus('battleAnalysis')
  @ZodResponse({ type: AnalyticsRngDto })
  rng(@CurrentUserId() userId: string, @Query() query: AnalyticsQueryDto) {
    return this.honestRng.rng({ ...query, userId });
  }

  @Get('battles')
  @ZodResponse({ type: MyBattlesPageDto })
  battleList(@CurrentUserId() userId: string, @Query() query: AnalyticsBattlesQueryDto) {
    return this.battles.list({ ...query, userId });
  }

  @Get('battles/:id')
  @ZodResponse({ type: MyBattleDto })
  battle(@CurrentUserId() userId: string, @Param() { id }: AnalyticsBattleParamsDto) {
    return this.battles.detail({ userId, id });
  }

  @Get('battles/:id/analysis')
  @ZodResponse({ type: BattleAnalysisDto })
  analysis(@CurrentUserId() userId: string, @Param() { id }: AnalyticsBattleParamsDto) {
    return this.battles.analysis({ userId, id });
  }

  @Get('playlist')
  @ZodResponse({ type: PlaylistDto })
  playlist(@CurrentUserId() userId: string, @Query() query: PlaylistQueryDto) {
    return this.playlists.playlist({ ...query, userId });
  }

  @Get('first-win')
  @ZodResponse({ type: FirstWinDto })
  firstWin(@CurrentUserId() userId: string, @Query() query: AnalyticsAccountQueryDto) {
    return this.firstWins.status({ ...query, userId });
  }
}
