import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { DiscordStatusDto } from './dto/discord.dto';
import { DiscordStatusReaderService } from './services/discord-status-reader.service';

@ApiTags('discord')
@Controller('discord')
export class DiscordController {
  constructor(private readonly statuses: DiscordStatusReaderService) {}

  @AllowAnonymous()
  @Get('status')
  @ZodResponse({ type: DiscordStatusDto })
  status() {
    return this.statuses.status();
  }
}
