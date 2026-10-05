import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import {
  ApiErrorLogDto,
  ApiKeysDto,
  ApiUsageDto,
  ApiUsageQueryDto,
  CreateApiKeyDto,
  CreatedApiKeyDto,
  CreatedWebhookEndpointDto,
  CreateWebhookEndpointDto,
  DeveloperIdParamsDto,
  DeveloperOverviewDto,
  UpdateWebhookEndpointDto,
  WebhookDeliveriesDto,
  WebhookEndpointDto,
  WebhookEndpointsDto
} from './dto/developer.dto';
import { ApiKeysWriterService } from './services/api-keys-writer.service';
import { ApiUsageReaderService } from './services/api-usage-reader.service';
import { WebhookEndpointsWriterService } from './services/webhook-endpoints-writer.service';

@ApiTags('developer')
@Controller('me/developer')
export class DeveloperController {
  constructor(
    private readonly keys: ApiKeysWriterService,
    private readonly usage: ApiUsageReaderService,
    private readonly webhooks: WebhookEndpointsWriterService
  ) {}

  @Get()
  @ZodResponse({ type: DeveloperOverviewDto })
  overview(@CurrentUserId() userId: string) {
    return this.keys.overview(userId);
  }

  @Get('keys')
  @ZodResponse({ type: ApiKeysDto })
  listKeys(@CurrentUserId() userId: string) {
    return this.keys.list(userId);
  }

  @Post('keys')
  @ZodResponse({ type: CreatedApiKeyDto, status: HttpStatus.CREATED })
  createKey(@CurrentUserId() userId: string, @Body() body: CreateApiKeyDto) {
    return this.keys.create({ ...body, userId });
  }

  @Delete('keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeKey(@CurrentUserId() userId: string, @Param() { id }: DeveloperIdParamsDto) {
    await this.keys.revoke({ userId, id });
  }

  @Get('keys/:id/usage')
  @ZodResponse({ type: ApiUsageDto })
  keyUsage(@CurrentUserId() userId: string, @Param() { id }: DeveloperIdParamsDto, @Query() { days }: ApiUsageQueryDto) {
    return this.usage.usage({ userId, id, days });
  }

  @Get('keys/:id/errors')
  @ZodResponse({ type: ApiErrorLogDto })
  keyErrors(@CurrentUserId() userId: string, @Param() { id }: DeveloperIdParamsDto) {
    return this.usage.errors({ userId, id });
  }

  @Get('webhooks')
  @ZodResponse({ type: WebhookEndpointsDto })
  listWebhooks(@CurrentUserId() userId: string) {
    return this.webhooks.list(userId);
  }

  @Post('webhooks')
  @ZodResponse({ type: CreatedWebhookEndpointDto, status: HttpStatus.CREATED })
  createWebhook(@CurrentUserId() userId: string, @Body() body: CreateWebhookEndpointDto) {
    return this.webhooks.create({ ...body, userId });
  }

  @Patch('webhooks/:id')
  @ZodResponse({ type: WebhookEndpointDto })
  updateWebhook(@CurrentUserId() userId: string, @Param() { id }: DeveloperIdParamsDto, @Body() body: UpdateWebhookEndpointDto) {
    return this.webhooks.update({ ...body, userId, id });
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWebhook(@CurrentUserId() userId: string, @Param() { id }: DeveloperIdParamsDto) {
    await this.webhooks.remove({ userId, id });
  }

  @Get('webhooks/:id/deliveries')
  @ZodResponse({ type: WebhookDeliveriesDto })
  deliveries(@CurrentUserId() userId: string, @Param() { id }: DeveloperIdParamsDto) {
    return this.webhooks.deliveries({ userId, id });
  }
}
