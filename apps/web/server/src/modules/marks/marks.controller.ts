import { CacheTTL } from '@nestjs/cache-manager';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import {
  MoeCurveDto,
  MoeCurveParamsDto,
  MoeHistoryBatchDto,
  MoeHistoryBatchQueryDto,
  MoeHistoryDto,
  MoeHistoryFiltersDto,
  MoeHistoryParamsDto,
  MoePageDto,
  MoeProjectionDto,
  MoeProjectionInputDto,
  MoeQueryDto
} from './dto/marks.dto';
import { MoeCurveReaderService } from './services/moe-curve-reader.service';
import { MoeTableReaderService } from './services/moe-table-reader.service';
import { ProjectionReaderService } from './services/projection-reader.service';

@ApiTags('marks')
@AllowAnonymous()
@Controller('marks')
export class MarksController {
  constructor(
    private readonly table: MoeTableReaderService,
    private readonly projection: ProjectionReaderService,
    private readonly curves: MoeCurveReaderService
  ) {}

  @Get()
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: MoePageDto })
  list(@Query() query: MoeQueryDto) {
    return this.table.table(query);
  }

  @Get('history')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: MoeHistoryBatchDto })
  historyBatch(@Query() query: MoeHistoryBatchQueryDto) {
    return this.table.historyBatch(query);
  }

  @Get(':tankId/history')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: MoeHistoryDto })
  history(@Param() { tankId }: MoeHistoryParamsDto, @Query() filters: MoeHistoryFiltersDto) {
    return this.table.history({ tankId, ...filters });
  }

  @Get(':tankId/curve')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: MoeCurveDto })
  curve(@Param() { tankId }: MoeCurveParamsDto) {
    return this.curves.curve(tankId);
  }

  @Post('projection')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: MoeProjectionDto })
  project(@Body() input: MoeProjectionInputDto) {
    return this.projection.project(input);
  }
}
