import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix } from '../../../common/decorators';
import { SlugParamsDto } from '../dto/params.dto';
import { STREAMERS } from './config/directory.constants';
import { ClaimStatusDto, StartClaimDto, StreamerClaimDto } from './dto/profiles.dto';
import { StreamerClaimService } from './services/streamer-claim.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerClaimsController {
  constructor(private readonly claims: StreamerClaimService) {}

  @Get(':slug/claim')
  @ZodResponse({ type: ClaimStatusDto })
  async claimStatus(@CurrentUserId() userId: string, @Param() { slug }: SlugParamsDto) {
    return { claim: await this.claims.mine({ userId, slug }) };
  }

  @Throttle({ default: STREAMERS.claimThrottle })
  @Post(':slug/claim')
  @ZodResponse({ type: StreamerClaimDto, status: HttpStatus.CREATED })
  claim(@CurrentUserId() userId: string, @Param() { slug }: SlugParamsDto, @Body() body: StartClaimDto) {
    return this.claims.start({ ...body, userId, slug });
  }

  @Throttle({ default: STREAMERS.claimThrottle })
  @Post(':slug/claim/verify')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: StreamerClaimDto })
  verifyClaim(@CurrentUserId() userId: string, @Param() { slug }: SlugParamsDto) {
    return this.claims.verify({ userId, slug });
  }
}
