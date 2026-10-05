import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import {
  ClanEventsPageDto,
  ClanEventsQueryDto,
  ClanListPageDto,
  ClanListQueryDto,
  ClanLookupParamsDto,
  ClanMembersDto,
  ClanPageDto,
  ClanParamsDto,
  ClanStrongholdDto
} from './dto/clans.dto';
import { ClanListReaderService } from './services/clan-list-reader.service';
import { ClanPageReaderService } from './services/clan-page-reader.service';
import { ClanResolverService } from './services/clan-resolver.service';
import { ClanStrongholdReaderService } from './services/clan-stronghold-reader.service';

@ApiTags('clans')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('clans')
export class ClansController {
  constructor(
    private readonly resolver: ClanResolverService,
    private readonly pages: ClanPageReaderService,
    private readonly lists: ClanListReaderService,
    private readonly strongholds: ClanStrongholdReaderService
  ) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: ClanListPageDto })
  list(@Query() query: ClanListQueryDto) {
    return this.lists.list(query);
  }

  @Get(':idOrTag')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: ClanPageDto })
  async page(@Param() { idOrTag }: ClanLookupParamsDto) {
    const clanId = await this.resolver.resolve(idOrTag);

    return this.pages.page(clanId);
  }

  @Get(':id/members')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: ClanMembersDto })
  async members(@Param() { id }: ClanParamsDto) {
    const clanId = await this.resolver.ensure(BigInt(id));

    return this.pages.members(clanId);
  }

  @Get(':id/stronghold')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: ClanStrongholdDto })
  async stronghold(@Param() { id }: ClanParamsDto) {
    const clanId = await this.resolver.ensure(BigInt(id));

    return this.strongholds.stronghold(clanId);
  }

  @Get(':id/events')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: ClanEventsPageDto })
  async events(@Param() { id }: ClanParamsDto, @Query() { limit, offset }: ClanEventsQueryDto) {
    const clanId = await this.resolver.ensure(BigInt(id));

    return this.pages.events({ clanId, limit, offset });
  }
}
