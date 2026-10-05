import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { LeaderboardReaderService } from '../leaderboards';
import { PublicApi } from './decorators';
import { V1LeaderboardDto, V1LeaderboardQueryDto } from './dto';

@UseInterceptors(ViewerCacheInterceptor)
@PublicApi('leaderboards')
@Controller('v1/leaderboards')
export class V1LeaderboardsController {
  constructor(private readonly leaderboards: LeaderboardReaderService) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'getLeaderboard', summary: 'Players, clans, rising stars, marks and streamers leaderboards' })
  @ZodResponse({ type: V1LeaderboardDto, status: HttpStatus.OK })
  list(@Query() query: V1LeaderboardQueryDto) {
    return this.leaderboards.leaderboard(query);
  }
}
