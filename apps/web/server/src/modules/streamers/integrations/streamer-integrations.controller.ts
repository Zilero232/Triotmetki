import type { Request, Response } from 'express';

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Redirect, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { parseCookies } from 'better-auth/cookies';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix, OptionalUserId } from '../../../common/decorators';
import { OAUTH_STATE, PROVIDER_FROM_PATH } from './config/integrations.constants';
import { ConnectProviderDto, ConnectUrlDto, IntegrationListDto, OAuthCallbackDto, UpdatePredictionsDto } from './dto/integrations.dto';
import { IntegrationConnectWriterService } from './services/integration-connect-writer.service';
import { IntegrationWriterService } from './services/integration-writer.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerIntegrationsController {
  constructor(
    private readonly integrations: IntegrationConnectWriterService,
    private readonly store: IntegrationWriterService
  ) {}

  @Get('me/integrations')
  @ZodResponse({ type: IntegrationListDto })
  listIntegrations(@CurrentUserId() userId: string) {
    return this.store.list(userId);
  }

  @Post('me/integrations/:provider/connect')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: ConnectUrlDto })
  async connect(@CurrentUserId() userId: string, @Param() { provider }: ConnectProviderDto, @Res({ passthrough: true }) response: Response) {
    const { url, binding } = await this.integrations.connectUrl({ userId, provider: PROVIDER_FROM_PATH[provider] });

    response.cookie(OAUTH_STATE.cookie, binding, this.integrations.bindingCookie());

    return { url };
  }

  @Put('me/integrations/twitch/predictions')
  @ZodResponse({ type: IntegrationListDto })
  setPredictions(@CurrentUserId() userId: string, @Body() { enabled }: UpdatePredictionsDto) {
    return this.store.setPredictions({ userId, enabled });
  }

  @Delete('me/integrations/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUserId() userId: string, @Param() { provider }: ConnectProviderDto) {
    await this.store.remove({ userId, provider: PROVIDER_FROM_PATH[provider] });
  }

  @AllowAnonymous()
  @Get('integrations/:provider/callback')
  @Redirect()
  async callback(
    @Param() { provider }: ConnectProviderDto,
    @Query() { code, state }: OAuthCallbackDto,
    @OptionalUserId() viewerId: string | null,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const binding = parseCookies(request.headers.cookie ?? '').get(OAUTH_STATE.cookie) ?? null;

    response.clearCookie(OAUTH_STATE.cookie, { path: OAUTH_STATE.cookiePath });

    return { url: await this.integrations.callback({ provider: PROVIDER_FROM_PATH[provider], code, state, binding, viewerId }) };
  }
}
