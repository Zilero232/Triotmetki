import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { ComparePlayersQueryDto, CompareTanksQueryDto, PlayerComparisonDto, TankComparisonDto } from './dto/compare.dto';
import { PlayerCompareReaderService } from './services/player-compare-reader.service';
import { TankCompareReaderService } from './services/tank-compare-reader.service';

@ApiTags('compare')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('compare')
export class CompareController {
  constructor(
    private readonly players: PlayerCompareReaderService,
    private readonly tanks: TankCompareReaderService
  ) {}

  @Get('players')
  @CacheTTL(CACHE_TTL.player)
  @ZodResponse({ type: PlayerComparisonDto })
  comparePlayers(@Query() { ids, accountIds }: ComparePlayersQueryDto) {
    return this.players.compare({ accountIds: accountIds ?? ids ?? [] });
  }

  @Get('tanks')
  @CacheTTL(CACHE_TTL.reference)
  @ZodResponse({ type: TankComparisonDto })
  compareTanks(@Query() { ids, tankIds, profiles }: CompareTanksQueryDto) {
    return this.tanks.compare({ tankIds: tankIds ?? ids ?? [], profiles });
  }
}
