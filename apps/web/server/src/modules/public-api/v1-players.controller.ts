import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import {
  HISTORY_WINDOW,
  PlayerHistoryReaderService,
  PlayerMarksReaderService,
  PlayerResolverService,
  PlayerSessionsReaderService,
  PlayerSummaryReaderService,
  PlayerTanksReaderService
} from '../players';
import { PublicApi } from './decorators/public-api.decorator';
import {
  V1PlayerLookupDto,
  V1PlayerMarksDto,
  V1PlayerParamsDto,
  V1PlayerProfileDto,
  V1PlayerTanksPageDto,
  V1PlayerTanksQueryDto,
  V1RecentPeriodsDto,
  V1SessionDto,
  V1SessionParamsDto,
  V1SessionsPageDto,
  V1SessionsQueryDto,
  V1TimeSeriesDto,
  V1TimeSeriesQueryDto
} from './dto/v1.dto';

@UseInterceptors(ViewerCacheInterceptor)
@PublicApi('players')
@Controller('v1/players')
export class V1PlayersController {
  constructor(
    private readonly resolver: PlayerResolverService,
    private readonly summary: PlayerSummaryReaderService,
    private readonly tanks: PlayerTanksReaderService,
    private readonly history: PlayerHistoryReaderService,
    private readonly sessions: PlayerSessionsReaderService,
    private readonly marks: PlayerMarksReaderService
  ) {}

  @Get(':idOrNick')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'getPlayer', summary: 'Player summary with WN8, EFF, Броня-Индекс and every recent period' })
  @ZodResponse({ type: V1PlayerProfileDto, status: HttpStatus.OK })
  async player(@Param() { idOrNick }: V1PlayerLookupDto) {
    return this.summary.profile(await this.resolver.resolve(idOrNick));
  }

  @Get(':id/recent')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'getPlayerRecent', summary: 'Recent periods: 24h, 7d, 30d, 60d, 1000 battles' })
  @ZodResponse({ type: V1RecentPeriodsDto, status: HttpStatus.OK })
  async recent(@Param() { id }: V1PlayerParamsDto) {
    const profile = await this.summary.profile(await this.resolver.ensure(BigInt(id)));

    return profile.recent;
  }

  @Get(':id/tanks')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'listPlayerTanks', summary: 'Per-tank statistics' })
  @ZodResponse({ type: V1PlayerTanksPageDto, status: HttpStatus.OK })
  async playerTanks(@Param() { id }: V1PlayerParamsDto, @Query() query: V1PlayerTanksQueryDto) {
    return this.tanks.list({ accountId: await this.resolver.ensure(BigInt(id)), query });
  }

  @Get(':id/history')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'getPlayerHistory', summary: 'A metric over time' })
  @ZodResponse({ type: V1TimeSeriesDto, status: HttpStatus.OK })
  async playerHistory(@Param() { id }: V1PlayerParamsDto, @Query() query: V1TimeSeriesQueryDto) {
    return this.history.series({ accountId: await this.resolver.ensure(BigInt(id)), query, policy: HISTORY_WINDOW.publicApi });
  }

  @Get(':id/marks')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'getPlayerMarks', summary: 'Marks of excellence per tank, with the current MoE percent when the mod reports it' })
  @ZodResponse({ type: V1PlayerMarksDto, status: HttpStatus.OK })
  async playerMarks(@Param() { id }: V1PlayerParamsDto) {
    return this.marks.marks(await this.resolver.ensure(BigInt(id)));
  }

  @Get(':id/sessions')
  @CacheTTL(CACHE_TTL.short)
  @ApiOperation({ operationId: 'listPlayerSessions', summary: 'Play sessions, newest first' })
  @ZodResponse({ type: V1SessionsPageDto, status: HttpStatus.OK })
  async playerSessions(@Param() { id }: V1PlayerParamsDto, @Query() { limit, offset }: V1SessionsQueryDto) {
    return this.sessions.list({ accountId: await this.resolver.ensure(BigInt(id)), limit, offset });
  }

  @Get(':id/sessions/:sessionId')
  @CacheTTL(CACHE_TTL.short)
  @ApiOperation({ operationId: 'getPlayerSession', summary: 'One session with its tanks and, for mod sessions, its battles' })
  @ZodResponse({ type: V1SessionDto, status: HttpStatus.OK })
  async playerSession(@Param() { id, sessionId }: V1SessionParamsDto) {
    return this.sessions.detail({ accountId: await this.resolver.ensure(BigInt(id)), sessionId });
  }
}
