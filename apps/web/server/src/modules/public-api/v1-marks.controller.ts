import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { MoeTableReaderService } from '../marks';
import { PublicApi } from './decorators/public-api.decorator';
import {
  V1MoeHistoryBatchDto,
  V1MoeHistoryBatchQueryDto,
  V1MoeHistoryDto,
  V1MoeHistoryFiltersDto,
  V1MoePageDto,
  V1MoeQueryDto,
  V1TankParamsDto
} from './dto/v1.dto';

@UseInterceptors(ViewerCacheInterceptor)
@PublicApi('marks')
@Controller('v1/marks')
export class V1MarksController {
  constructor(private readonly table: MoeTableReaderService) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'listMarkThresholds', summary: 'Marks of excellence thresholds (65/85/95/100 %) and mastery thresholds per tank' })
  @ZodResponse({ type: V1MoePageDto, status: HttpStatus.OK })
  list(@Query() query: V1MoeQueryDto) {
    return this.table.table(query);
  }

  @Get('history')
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'getMarkHistoryBatch', summary: 'Threshold history of up to 100 tanks at once' })
  @ZodResponse({ type: V1MoeHistoryBatchDto, status: HttpStatus.OK })
  historyBatch(@Query() query: V1MoeHistoryBatchQueryDto) {
    return this.table.historyBatch(query);
  }

  @Get(':id/history')
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'getMarkHistory', summary: 'Threshold history of one tank' })
  @ZodResponse({ type: V1MoeHistoryDto, status: HttpStatus.OK })
  history(@Param() { id }: V1TankParamsDto, @Query() filters: V1MoeHistoryFiltersDto) {
    return this.table.history({ tankId: id, ...filters });
  }
}
