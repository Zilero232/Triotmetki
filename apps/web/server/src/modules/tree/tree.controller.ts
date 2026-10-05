import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { TechTreeDto, TechTreeParamsDto } from './dto/tree.dto';
import { TechTreeReaderService } from './services/tech-tree-reader.service';

@ApiTags('tanks')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('tree')
export class TreeController {
  constructor(private readonly trees: TechTreeReaderService) {}

  @Get(':nation')
  @CacheTTL(CACHE_TTL.reference)
  @ZodResponse({ type: TechTreeDto })
  tree(@Param() { nation }: TechTreeParamsDto) {
    return this.trees.tree(nation);
  }
}
