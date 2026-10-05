import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { ClanListReaderService, ClanPageReaderService, ClanResolverService } from '../clans';
import { PublicApi } from './decorators/public-api.decorator';
import {
  V1ClanEventsPageDto,
  V1ClanEventsQueryDto,
  V1ClanListPageDto,
  V1ClanListQueryDto,
  V1ClanMembersDto,
  V1ClanPageDto,
  V1ClanParamsDto
} from './dto/v1.dto';

@UseInterceptors(ViewerCacheInterceptor)
@PublicApi('clans')
@Controller('v1/clans')
export class V1ClansController {
  constructor(
    private readonly resolver: ClanResolverService,
    private readonly pages: ClanPageReaderService,
    private readonly lists: ClanListReaderService
  ) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'listClans', summary: 'Search and filter clans' })
  @ZodResponse({ type: V1ClanListPageDto, status: HttpStatus.OK })
  list(@Query() query: V1ClanListQueryDto) {
    return this.lists.list(query);
  }

  @Get(':id')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'getClan', summary: 'Clan page: stats, members, recent roster changes' })
  @ZodResponse({ type: V1ClanPageDto, status: HttpStatus.OK })
  async clan(@Param() { id }: V1ClanParamsDto) {
    return this.pages.page(await this.resolver.ensure(BigInt(id)));
  }

  @Get(':id/members')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'listClanMembers', summary: 'Members with their ratings and activity' })
  @ZodResponse({ type: V1ClanMembersDto, status: HttpStatus.OK })
  async members(@Param() { id }: V1ClanParamsDto) {
    return this.pages.members(await this.resolver.ensure(BigInt(id)));
  }

  @Get(':id/events')
  @CacheTTL(CACHE_TTL.player)
  @ApiOperation({ operationId: 'listClanEvents', summary: 'Roster changes: joins, leaves, role changes' })
  @ZodResponse({ type: V1ClanEventsPageDto, status: HttpStatus.OK })
  async events(@Param() { id }: V1ClanParamsDto, @Query() { limit, offset }: V1ClanEventsQueryDto) {
    return this.pages.events({ clanId: await this.resolver.ensure(BigInt(id)), limit, offset });
  }
}
