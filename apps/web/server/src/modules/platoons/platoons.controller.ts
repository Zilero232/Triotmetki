import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { IdParamsDto } from '../community-core';
import { CreatePlatoonDto, PlatoonPageDto, PlatoonPostDto, PlatoonQueryDto } from './dto/platoons.dto';
import { PlatoonWriterService } from './services/platoon-writer.service';

@ApiTags('community')
@Controller('community/platoons')
export class PlatoonsController {
  constructor(private readonly platoons: PlatoonWriterService) {}

  @AllowAnonymous()
  @Get()
  @ZodResponse({ type: PlatoonPageDto })
  listPlatoons(@Query() query: PlatoonQueryDto) {
    return this.platoons.list(query);
  }

  @Post()
  @ZodResponse({ type: PlatoonPostDto, status: HttpStatus.CREATED })
  createPlatoon(@CurrentUserId() userId: string, @Body() body: CreatePlatoonDto) {
    return this.platoons.create({ ...body, userId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async closePlatoon(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    await this.platoons.close({ id, userId });
  }
}
