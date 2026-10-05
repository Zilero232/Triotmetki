import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { BONUS_CODE } from './config/bonus-codes.constants';
import {
  BonusCodeDto,
  BonusCodeListDto,
  BonusCodeReportDto,
  BonusCodesQueryDto,
  NewsPageDto,
  NewsQueryDto,
  OfferArchiveDto,
  OfferArchiveQueryDto,
  OfferPageDto,
  OffersQueryDto
} from './dto/shop.dto';
import { BonusCodeWriterService } from './services/bonus-code-writer.service';
import { NewsReaderService } from './services/news-reader.service';
import { OfferReaderService } from './services/offer-reader.service';

@ApiTags('shop')
@Controller()
export class ShopController {
  constructor(
    private readonly offers: OfferReaderService,
    private readonly bonusCodes: BonusCodeWriterService,
    private readonly news: NewsReaderService
  ) {}

  @AllowAnonymous()
  @Get('shop/offers')
  @ZodResponse({ type: OfferPageDto })
  listOffers(@Query() query: OffersQueryDto) {
    return this.offers.list(query);
  }

  @AllowAnonymous()
  @Get('shop/offers/archive')
  @ZodResponse({ type: OfferArchiveDto })
  archive(@Query() { tankId }: OfferArchiveQueryDto) {
    return this.offers.archive(tankId);
  }

  @AllowAnonymous()
  @Get('shop/bonus-codes')
  @ZodResponse({ type: BonusCodeListDto })
  listBonusCodes(@Query() { status }: BonusCodesQueryDto) {
    return this.bonusCodes.list({ status });
  }

  @Post('shop/bonus-codes/report')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: BONUS_CODE.reportThrottle })
  @ZodResponse({ type: BonusCodeDto })
  report(@CurrentUserId() userId: string, @Body() { code, verdict }: BonusCodeReportDto, @Ip() ip: string | undefined) {
    return this.bonusCodes.report({ userId, code, verdict, ip: ip ?? null });
  }

  @AllowAnonymous()
  @Get('news')
  @ZodResponse({ type: NewsPageDto })
  listNews(@Query() query: NewsQueryDto) {
    return this.news.list(query);
  }
}
