import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { SearchQueryDto, SearchResponseDto } from './dto/search.dto';
import { SearchReaderService } from './services/search-reader.service';

@ApiTags('search')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchReaderService) {}

  @Get()
  @CacheTTL(CACHE_TTL.short)
  @ZodResponse({ type: SearchResponseDto })
  search(@Query() { q, kinds, limit }: SearchQueryDto) {
    return this.searchService.search({ q, kinds, limit });
  }
}
