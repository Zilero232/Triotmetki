import { CacheTTL } from '@nestjs/cache-manager';
import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Post, Query, StreamableFile, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { CurrentUserId } from '../../common/decorators';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { SIGNATURE } from './config/signature.constants';
import {
  ChallengesDto,
  CreateFollowDto,
  FeedDto,
  FeedQueryDto,
  FollowListDto,
  FollowParamsDto,
  LeagueDto,
  LeagueQueryDto,
  SignatureParamsDto,
  WrappedDto,
  WrappedParamsDto,
  WrappedQueryDto
} from './dto/social.dto';
import { FeedReaderService } from './services/feed-reader.service';
import { FollowReaderService } from './services/follow-reader.service';
import { FollowWriterService } from './services/follow-writer.service';
import { LeagueReaderService } from './services/league-reader.service';
import { SignatureReaderService } from './services/signature-reader.service';
import { WeeklyChallengeReaderService } from './services/weekly-challenge-reader.service';
import { WrappedReaderService } from './services/wrapped-reader.service';

@ApiTags('social')
@Controller()
export class SocialController {
  constructor(
    private readonly follows: FollowReaderService,
    private readonly followWriter: FollowWriterService,
    private readonly feeds: FeedReaderService,
    private readonly leagues: LeagueReaderService,
    private readonly challenges: WeeklyChallengeReaderService,
    private readonly signatures: SignatureReaderService,
    private readonly wrapped: WrappedReaderService
  ) {}

  @Get('social/follows')
  @ZodResponse({ type: FollowListDto })
  listFollows(@CurrentUserId() userId: string) {
    return this.follows.list(userId);
  }

  @Post('social/follows')
  @ZodResponse({ type: FollowListDto, status: HttpStatus.CREATED })
  follow(@CurrentUserId() userId: string, @Body() body: CreateFollowDto) {
    return this.followWriter.create({ ...body, userId });
  }

  @Delete('social/follows/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(@CurrentUserId() userId: string, @Param() { id }: FollowParamsDto) {
    await this.followWriter.remove({ userId, id });
  }

  @Get('social/feed')
  @ZodResponse({ type: FeedDto })
  feed(@CurrentUserId() userId: string, @Query() { days }: FeedQueryDto) {
    return this.feeds.feed({ userId, days });
  }

  @Get('social/leagues')
  @ZodResponse({ type: LeagueDto })
  league(@CurrentUserId() userId: string, @Query() { scope, metric, week }: LeagueQueryDto) {
    return this.leagues.league({ userId, scope, metric, week });
  }

  @Get('social/challenges')
  @ZodResponse({ type: ChallengesDto })
  weeklyChallenges(@CurrentUserId() userId: string) {
    return this.challenges.forUser(userId);
  }

  @AllowAnonymous()
  @Get('sig/:file')
  @Header('content-type', 'image/png')
  @Header('cache-control', `public, max-age=${SIGNATURE.cacheSeconds}`)
  async signature(@Param() { file }: SignatureParamsDto) {
    return new StreamableFile(await this.signatures.png(file), { type: 'image/png' });
  }

  @AllowAnonymous()
  @Get('players/:id/wrapped')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: WrappedDto })
  yearWrapped(@Param() { id }: WrappedParamsDto, @Query() { year }: WrappedQueryDto) {
    return this.wrapped.wrapped({ accountId: id, year });
  }
}
