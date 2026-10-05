import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { CacheByViewer, OptionalUserId } from '../../common/decorators';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import {
  ActivityDto,
  ActivityQueryDto,
  InsightsQueryDto,
  NicknameHistoryDto,
  PlayerAchievementsDto,
  PlayerCareerDto,
  PlayerInsightsDto,
  PlayerLookupParamsDto,
  PlayerMarksDto,
  PlayerModesDto,
  PlayerOfficialRatingsDto,
  PlayerParamsDto,
  PlayerProfileDto,
  PlayerTanksPageDto,
  PlayerTanksQueryDto,
  PlaytimeDto,
  PopularPlayersDto,
  PopularPlayersQueryDto,
  SessionDto,
  SessionParamsDto,
  SessionsPageDto,
  SessionsQueryDto,
  TimeSeriesDto,
  TimeSeriesQueryDto
} from './dto';
import {
  PlayerAchievementsReaderService,
  PlayerCareerReaderService,
  PlayerHistoryReaderService,
  PlayerInsightsReaderService,
  PlayerMarksReaderService,
  PlayerOfficialRatingsReaderService,
  PlayerPlaytimeReaderService,
  PlayerResolverService,
  PlayerSessionsReaderService,
  PlayerSummaryReaderService,
  PlayerTanksReaderService,
  PlayerViewsService
} from './services';

@ApiTags('players')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('players')
export class PlayersController {
  constructor(
    private readonly resolver: PlayerResolverService,
    private readonly summary: PlayerSummaryReaderService,
    private readonly tanks: PlayerTanksReaderService,
    private readonly history: PlayerHistoryReaderService,
    private readonly sessions: PlayerSessionsReaderService,
    private readonly marksService: PlayerMarksReaderService,
    private readonly insightsService: PlayerInsightsReaderService,
    private readonly playtimeService: PlayerPlaytimeReaderService,
    private readonly views: PlayerViewsService,
    private readonly achievementsService: PlayerAchievementsReaderService,
    private readonly careerService: PlayerCareerReaderService,
    private readonly official: PlayerOfficialRatingsReaderService
  ) {}

  @Get('popular')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PopularPlayersDto })
  popular(@Query() query: PopularPlayersQueryDto) {
    return this.views.popular(query);
  }

  @Get(':idOrNick')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerProfileDto })
  async profile(@Param() { idOrNick }: PlayerLookupParamsDto) {
    const accountId = await this.resolver.resolve(idOrNick);

    this.views.record(accountId);

    return this.summary.profile(accountId);
  }

  @Get(':id/tanks')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerTanksPageDto })
  async playerTanks(@Param() { id }: PlayerParamsDto, @Query() query: PlayerTanksQueryDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.tanks.list({ accountId, query });
  }

  @Get(':id/history')
  @CacheTTL(CACHE_TTL.player)
  @CacheByViewer()
  @ZodResponse({ type: TimeSeriesDto })
  async series(@Param() { id }: PlayerParamsDto, @Query() query: TimeSeriesQueryDto, @OptionalUserId() viewerUserId: string | null) {
    const accountId = await this.resolver.ensure(BigInt(id));
    const policy = await this.history.policyFor({ accountId, viewerUserId });

    return this.history.series({ accountId, query, policy });
  }

  @Get(':id/activity')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: ActivityDto })
  async activity(@Param() { id }: PlayerParamsDto, @Query() { days }: ActivityQueryDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.history.activity({ accountId, days });
  }

  @Get(':id/sessions')
  @CacheTTL(CACHE_TTL.short)
  @ZodResponse({ type: SessionsPageDto })
  async sessionList(@Param() { id }: PlayerParamsDto, @Query() { limit, offset }: SessionsQueryDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.sessions.list({ accountId, limit, offset });
  }

  @Get(':id/sessions/:sessionId')
  @CacheTTL(CACHE_TTL.short)
  @ZodResponse({ type: SessionDto })
  async session(@Param() { id, sessionId }: SessionParamsDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.sessions.detail({ accountId, sessionId });
  }

  @Get(':id/marks')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerMarksDto })
  async marks(@Param() { id }: PlayerParamsDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.marksService.marks(accountId);
  }

  @Get(':id/insights')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerInsightsDto })
  async insights(@Param() { id }: PlayerParamsDto, @Query() { period }: InsightsQueryDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.insightsService.insights({ accountId, period });
  }

  @Get(':idOrNick/achievements')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerAchievementsDto })
  async achievements(@Param() { idOrNick }: PlayerLookupParamsDto) {
    const accountId = await this.resolver.resolve(idOrNick);

    return this.achievementsService.achievements(accountId);
  }

  @Get(':id/playtime')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlaytimeDto })
  async playtime(@Param() { id }: PlayerParamsDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.playtimeService.playtime(accountId);
  }

  @Get(':id/career')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerCareerDto })
  async career(@Param() { id }: PlayerParamsDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.careerService.career(accountId);
  }

  @Get(':id/modes')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerModesDto })
  async modes(@Param() { id }: PlayerParamsDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.careerService.modes({ accountId, allowLive: true });
  }

  @Get(':id/official-ratings')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerOfficialRatingsDto })
  async officialRatings(@Param() { id }: PlayerParamsDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.official.ratings(accountId);
  }

  @Get(':id/nickname-history')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: NicknameHistoryDto })
  async nicknames(@Param() { id }: PlayerParamsDto) {
    const accountId = await this.resolver.ensure(BigInt(id));

    return this.history.nicknames(accountId);
  }
}
