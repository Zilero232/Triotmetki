import { Body, Controller, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { MOD_REPORTS_API } from './config/mod-reports.constants';
import { ModProblemReportReceiptDto, ModProblemReportRequestDto } from './dto/mod-reports.dto';
import { ModReportsWriterService } from './services/mod-reports-writer.service';

@ApiTags('mod')
@Controller('mod/reports')
export class ModReportsController {
  constructor(private readonly reports: ModReportsWriterService) {}

  @AllowAnonymous()
  @Throttle({ default: MOD_REPORTS_API.throttle })
  @Post()
  @ApiOperation({ operationId: 'submitModProblemReport', summary: 'A problem report from the modpack manager with its log files, kept 30 days' })
  @ZodResponse({ type: ModProblemReportReceiptDto, status: HttpStatus.CREATED })
  submit(@Body() body: ModProblemReportRequestDto, @Ip() ip: string) {
    return this.reports.submit({ body, ip });
  }
}
