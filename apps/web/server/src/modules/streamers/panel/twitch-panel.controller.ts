import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { OperationIdPrefix } from '../../../common/decorators';
import { TwitchChannelParamsDto, TwitchPanelDto } from './dto/panel.dto';
import { TwitchPanelReaderService } from './services/twitch-panel-reader.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class TwitchPanelController {
  constructor(private readonly panels: TwitchPanelReaderService) {}

  @AllowAnonymous()
  @SkipThrottle()
  @Get('twitch-panel/:channelId')
  @ZodResponse({ type: TwitchPanelDto })
  twitchPanel(@Param() { channelId }: TwitchChannelParamsDto) {
    return this.panels.cached(channelId);
  }
}
