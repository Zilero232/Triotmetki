import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { MODERATION } from '../moderation';
import { IdParamsDto, SlugParamsDto } from './dto/params.dto';
import {
  AdminClaimListDto,
  EditorialStreamerDto,
  ResolveClaimDto,
  StreamerClaimService,
  StreamerInvitationListDto,
  StreamerInvitationService,
  StreamerModerationService
} from './profiles';
import { SaveStreamerSettingsDto, StreamerSettingsService } from './settings';

@ApiTags('streamers')
@Roles([...MODERATION.roles])
@Controller('admin/streamers')
export class AdminStreamersController {
  constructor(
    private readonly claims: StreamerClaimService,
    private readonly invites: StreamerInvitationService,
    private readonly moderation: StreamerModerationService,
    private readonly settings: StreamerSettingsService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEditorial(@Body() body: EditorialStreamerDto) {
    await this.moderation.createEditorial(body);
  }

  @Post(':slug/settings')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveEditorialSettings(@CurrentUserId() userId: string, @Param() { slug }: SlugParamsDto, @Body() body: SaveStreamerSettingsDto) {
    await this.settings.saveEditorial({ slug, userId, values: body.values, sourceUrls: body.sourceUrls });
  }

  @Post(':slug/hide')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hide(@Param() { slug }: SlugParamsDto) {
    await this.moderation.hide(slug);
  }

  @Get('claims')
  @ZodResponse({ type: AdminClaimListDto })
  pendingClaims() {
    return this.claims.pending();
  }

  @Post('claims/:id/resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resolveClaim(@CurrentUserId() moderatorId: string, @Param() { id }: IdParamsDto, @Body() { approve }: ResolveClaimDto) {
    await this.claims.resolve({ id, approve, moderatorId });
  }

  @Get('invitations')
  @ZodResponse({ type: StreamerInvitationListDto })
  invitations() {
    return this.invites.list();
  }

  @Post('invitations/seed')
  @HttpCode(HttpStatus.NO_CONTENT)
  async seedInvitations() {
    await this.invites.seed();
  }

  @Post('invitations/:slug/sent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async invitationSent(@Param() { slug }: SlugParamsDto) {
    await this.invites.markSent(slug);
  }
}
