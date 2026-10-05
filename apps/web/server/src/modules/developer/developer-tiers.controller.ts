import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ApiTiersDto } from './dto/developer.dto';
import { ApiTierReaderService } from './services/api-tier-reader.service';

@ApiTags('developer')
@Controller('developer')
export class DeveloperTiersController {
  constructor(private readonly tiers: ApiTierReaderService) {}

  @AllowAnonymous()
  @Get('tiers')
  @ZodResponse({ type: ApiTiersDto })
  list() {
    return this.tiers.tiers();
  }
}
