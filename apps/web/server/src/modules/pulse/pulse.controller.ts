import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { PulseDto } from './dto/pulse.dto';
import { PulseReaderService } from './services/pulse-reader.service';

@ApiTags('pulse')
@AllowAnonymous()
@Controller('pulse')
export class PulseController {
  constructor(private readonly pulse: PulseReaderService) {}

  @Get()
  @ZodResponse({ type: PulseDto })
  get() {
    return this.pulse.view(new Date());
  }
}
