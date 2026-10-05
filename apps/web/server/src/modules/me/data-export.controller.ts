import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { RequiresPlus } from '../billing';
import { AnalyticsExportDto, RawStatsExportDto } from './dto/me.dto';
import { DataExportReaderService } from './services/data-export-reader.service';

@ApiTags('me')
@Controller('me/export')
export class DataExportController {
  constructor(private readonly exports: DataExportReaderService) {}

  @Get('raw')
  @ZodResponse({ type: RawStatsExportDto })
  raw(@CurrentUserId() userId: string) {
    return this.exports.raw(userId);
  }

  @Get('analytics')
  @RequiresPlus('analyticsExport')
  @ZodResponse({ type: AnalyticsExportDto })
  analytics(@CurrentUserId() userId: string) {
    return this.exports.analytics(userId);
  }
}
