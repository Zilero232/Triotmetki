import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ViewerCacheInterceptor } from '../../common/interceptors';
import { BEST_BATTLES } from './config/feed.constants';
import { BestBattlesFacetsDto, BestBattlesFacetsQueryDto, BestBattlesPageDto, BestBattlesQueryDto } from './dto/best-battles.dto';
import { BestBattleFacetsReaderService } from './services/best-battle-facets-reader.service';
import { BestBattlesReaderService } from './services/best-battles-reader.service';

@ApiTags('best-battles')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('best-battles')
export class BestBattlesController {
  constructor(
    private readonly feed: BestBattlesReaderService,
    private readonly facets: BestBattleFacetsReaderService
  ) {}

  @Get()
  @CacheTTL(BEST_BATTLES.feedCacheMs)
  @ZodResponse({ type: BestBattlesPageDto })
  list(@Query() query: BestBattlesQueryDto) {
    return this.feed.page({ query, now: new Date() });
  }

  @Get('facets')
  @CacheTTL(BEST_BATTLES.facetsCacheMs)
  @ZodResponse({ type: BestBattlesFacetsDto })
  facetsOf(@Query() query: BestBattlesFacetsQueryDto) {
    return this.facets.facets({ query, now: new Date() });
  }
}
