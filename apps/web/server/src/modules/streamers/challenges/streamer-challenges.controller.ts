import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix } from '../../../common/decorators';
import { IdParamsDto } from '../dto/params.dto';
import { ActivateChallengeDto, ChallengeListDto, CreateChallengeDto, StreamerChallengeDto } from './dto/challenges.dto';
import { ChallengeWriterService } from './services/challenge-writer.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerChallengesController {
  constructor(private readonly challenges: ChallengeWriterService) {}

  @Get('me/challenges')
  @ZodResponse({ type: ChallengeListDto })
  listChallenges(@CurrentUserId() userId: string) {
    return this.challenges.list(userId);
  }

  @Post('me/challenges')
  @ZodResponse({ type: StreamerChallengeDto, status: HttpStatus.CREATED })
  createChallenge(@CurrentUserId() userId: string, @Body() body: CreateChallengeDto) {
    return this.challenges.create({ ...body, userId });
  }

  @Post('me/challenges/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: StreamerChallengeDto })
  activateChallenge(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() { donorName }: ActivateChallengeDto) {
    return this.challenges.activateByStreamer({ userId, id, donorName: donorName ?? null });
  }

  @Post('me/challenges/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: StreamerChallengeDto })
  cancelChallenge(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.challenges.cancel({ userId, id });
  }
}
