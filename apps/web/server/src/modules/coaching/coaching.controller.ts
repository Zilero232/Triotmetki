import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import { IdParamsDto } from '../community-core';
import {
  CoachDto,
  CoachesQueryDto,
  CoachingOrderDto,
  CoachingOrderListDto,
  CoachOfferDto,
  CoachPageDto,
  CreateOfferDto,
  CreateOrderDto,
  ReviewOrderDto,
  UpdateOfferDto,
  UpsertCoachDto
} from './dto/coaching.dto';
import { CoachProfileWriterService } from './services/coach-profile-writer.service';
import { CoachingOrderWriterService } from './services/coaching-order-writer.service';

@ApiTags('community')
@Controller('community/coaching')
export class CoachingController {
  constructor(
    private readonly profiles: CoachProfileWriterService,
    private readonly coachingOrders: CoachingOrderWriterService
  ) {}

  @AllowAnonymous()
  @Get('coaches')
  @ZodResponse({ type: CoachPageDto })
  list(@Query() query: CoachesQueryDto) {
    return this.profiles.list(query);
  }

  @AllowAnonymous()
  @Get('coaches/:id')
  @ZodResponse({ type: CoachDto })
  coach(@Param() { id }: IdParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.profiles.get({ userId: id, viewerUserId });
  }

  @Put('profile')
  @ZodResponse({ type: CoachDto })
  upsertProfile(@CurrentUserId() userId: string, @Body() body: UpsertCoachDto) {
    return this.profiles.upsertProfile({ ...body, userId });
  }

  @Post('offers')
  @ZodResponse({ type: CoachOfferDto, status: HttpStatus.CREATED })
  createOffer(@CurrentUserId() userId: string, @Body() body: CreateOfferDto) {
    return this.profiles.createOffer({ ...body, userId });
  }

  @Patch('offers/:id')
  @ZodResponse({ type: CoachOfferDto })
  updateOffer(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: UpdateOfferDto) {
    return this.profiles.updateOffer({ ...body, id, userId });
  }

  @Get('orders')
  @ZodResponse({ type: CoachingOrderListDto })
  orders(@CurrentUserId() userId: string) {
    return this.coachingOrders.orders(userId);
  }

  @Post('orders')
  @ZodResponse({ type: CoachingOrderDto, status: HttpStatus.CREATED })
  order(@CurrentUserId() userId: string, @Body() body: CreateOrderDto) {
    return this.coachingOrders.order({ ...body, userId });
  }

  @Post('orders/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CoachingOrderDto })
  accept(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.coachingOrders.accept({ id, userId });
  }

  @Post('orders/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CoachingOrderDto })
  complete(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.coachingOrders.complete({ id, userId });
  }

  @Post('orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CoachingOrderDto })
  cancel(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.coachingOrders.cancel({ id, userId });
  }

  @Post('orders/:id/review')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CoachingOrderDto })
  review(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: ReviewOrderDto) {
    return this.coachingOrders.review({ ...body, id, userId });
  }
}
