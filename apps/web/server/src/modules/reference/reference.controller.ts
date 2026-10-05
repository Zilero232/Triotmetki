import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { GameVersionDto, ServersOnlineDto } from './dto/reference.dto';
import { GameVersionService } from './services/game-version.service';
import { ServersOnlineService } from './services/servers-online.service';

@ApiTags('reference')
@AllowAnonymous()
@Controller('reference')
export class ReferenceController {
  constructor(
    private readonly gameVersion: GameVersionService,
    private readonly serversOnline: ServersOnlineService
  ) {}

  @Get('game-version')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: GameVersionDto })
  version() {
    return this.gameVersion.current();
  }

  @Get('servers')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.short)
  @ZodResponse({ type: ServersOnlineDto })
  servers() {
    return this.serversOnline.current();
  }
}
