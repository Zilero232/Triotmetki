import type { Response } from 'express';

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { HealthDto } from './dto/health.dto';
import { HealthReaderService } from './services/health-reader.service';

@ApiTags('health')
@AllowAnonymous()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthReaderService) {}

  @Get()
  @ZodResponse({ type: HealthDto })
  async check(@Res({ passthrough: true }) response: Response) {
    const result = await this.health.check();

    response.status(result.status === 'error' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK);

    return result;
  }
}
