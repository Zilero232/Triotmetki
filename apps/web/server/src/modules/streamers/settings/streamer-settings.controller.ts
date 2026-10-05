import { Body, Controller, Get, Header, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix } from '../../../common/decorators';
import { SlugParamsDto } from '../dto/params.dto';
import {
  SaveStreamerSettingsDto,
  SettingsAggregatesDto,
  SettingsAggregatesQueryDto,
  SettingsCompareDto,
  SettingsCompareQueryDto,
  SettingsHistoryDto,
  SettingsTableDto,
  StreamerSettingsViewDto
} from './dto/settings.dto';
import { SettingsAggregateService } from './services/settings-aggregate.service';
import { StreamerSettingsService } from './services/streamer-settings.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerSettingsController {
  constructor(
    private readonly settings: StreamerSettingsService,
    private readonly aggregates: SettingsAggregateService
  ) {}

  @AllowAnonymous()
  @Get('settings')
  @ZodResponse({ type: SettingsTableDto })
  settingsTable() {
    return this.settings.table();
  }

  @AllowAnonymous()
  @Get('settings/compare')
  @ZodResponse({ type: SettingsCompareDto })
  compareSettings(@Query() { slugs }: SettingsCompareQueryDto) {
    return this.settings.compare(slugs);
  }

  @AllowAnonymous()
  @Get('settings/aggregates')
  @ZodResponse({ type: SettingsAggregatesDto })
  settingsAggregates(@Query() { cohort }: SettingsAggregatesQueryDto) {
    return this.aggregates.read(cohort);
  }

  @Get('me/settings')
  @ZodResponse({ type: StreamerSettingsViewDto })
  mySettings(@CurrentUserId() userId: string) {
    return this.settings.mine(userId);
  }

  @Put('me/settings')
  @ZodResponse({ type: StreamerSettingsViewDto })
  saveSettings(@CurrentUserId() userId: string, @Body() body: SaveStreamerSettingsDto) {
    return this.settings.saveMine({ userId, source: body.source, values: body.values, sourceUrls: body.sourceUrls });
  }

  @AllowAnonymous()
  @Get(':slug/settings')
  @ZodResponse({ type: StreamerSettingsViewDto })
  settingsBySlug(@Param() { slug }: SlugParamsDto) {
    return this.settings.bySlug(slug);
  }

  @AllowAnonymous()
  @Get(':slug/settings.json')
  @Header('content-disposition', 'attachment')
  @ZodResponse({ type: StreamerSettingsViewDto })
  settingsJson(@Param() { slug }: SlugParamsDto) {
    return this.settings.bySlug(slug);
  }

  @AllowAnonymous()
  @Get(':slug/settings/history')
  @ZodResponse({ type: SettingsHistoryDto })
  settingsHistory(@Param() { slug }: SlugParamsDto) {
    return this.settings.history(slug);
  }
}
