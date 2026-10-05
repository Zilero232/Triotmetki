import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { CurrentUserId } from '../../common/decorators';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { RequiresPlus } from '../billing';
import { ModeMetaDto, ModeMetaQueryDto, ModeParamsDto, ModesHubDto, MyModeStatsDto, MyModeStatsQueryDto } from './dto/modes.dto';
import { ModeMetaReaderService } from './services/mode-meta-reader.service';
import { MyModeStatsReaderService } from './services/my-mode-stats-reader.service';

@ApiTags('modes')
@Controller('modes')
export class ModesController {
  constructor(
    private readonly meta: ModeMetaReaderService,
    private readonly mine: MyModeStatsReaderService
  ) {}

  @AllowAnonymous()
  @Get()
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: ModesHubDto })
  hub() {
    return this.meta.hub();
  }

  @Get('me')
  @RequiresPlus('analytics')
  @ZodResponse({ type: MyModeStatsDto })
  myStats(@CurrentUserId() userId: string, @Query() query: MyModeStatsQueryDto) {
    return this.mine.stats({ userId, query });
  }

  @AllowAnonymous()
  @Get(':mode')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: ModeMetaDto })
  modeMeta(@Param() { mode }: ModeParamsDto, @Query() query: ModeMetaQueryDto) {
    return this.meta.meta({ mode, query });
  }
}
