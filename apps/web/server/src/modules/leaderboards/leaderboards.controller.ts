import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import {
  LeaderboardDto,
  LeaderboardQueryDto,
  OfficialNeighborsDto,
  OfficialNeighborsQueryDto,
  OfficialPlayerParamsDto,
  OfficialRankHistoryDto,
  OfficialRankHistoryQueryDto,
  OfficialTopDto,
  OfficialTopQueryDto
} from './dto/leaderboards.dto';
import { LeaderboardReaderService } from './services/leaderboard-reader.service';
import { OfficialRatingsService } from './services/official-ratings.service';

@ApiTags('leaderboards')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(
    private readonly leaderboards: LeaderboardReaderService,
    private readonly official: OfficialRatingsService
  ) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: LeaderboardDto })
  list(@Query() query: LeaderboardQueryDto) {
    return this.leaderboards.leaderboard(query);
  }

  @Get('official')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: OfficialTopDto })
  officialTop(@Query() query: OfficialTopQueryDto) {
    return this.official.top(query);
  }

  @Get('official/players/:id/neighbors')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: OfficialNeighborsDto })
  officialNeighbors(@Param() { id }: OfficialPlayerParamsDto, @Query() query: OfficialNeighborsQueryDto) {
    return this.official.neighbors({ accountId: BigInt(id), query });
  }

  @Get('official/players/:id/history')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: OfficialRankHistoryDto })
  officialHistory(@Param() { id }: OfficialPlayerParamsDto, @Query() query: OfficialRankHistoryQueryDto) {
    return this.official.history({ accountId: BigInt(id), query });
  }
}
