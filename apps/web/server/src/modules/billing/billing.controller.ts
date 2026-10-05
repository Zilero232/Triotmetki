import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import {
  BillingStatusDto,
  CheckoutDto,
  CheckoutResultDto,
  PaymentHistoryDto,
  PlansDto,
  PromoRedeemDto,
  ReferralDto,
  WebhookAckDto,
  WebhookEventDto
} from './dto/billing.dto';
import { WebhookIpGuard } from './guards/webhook-ip.guard';
import { CheckoutWriterService } from './services/checkout-writer.service';
import { PromoWriterService } from './services/promo-writer.service';
import { ReferralWriterService } from './services/referral-writer.service';
import { SettlementWriterService } from './services/settlement-writer.service';
import { SubscriptionWriterService } from './services/subscription-writer.service';
import { TrialWriterService } from './services/trial-writer.service';

@ApiTags('billing')
@Controller()
export class BillingController {
  constructor(
    private readonly subscriptions: SubscriptionWriterService,
    private readonly checkout: CheckoutWriterService,
    private readonly promos: PromoWriterService,
    private readonly referrals: ReferralWriterService,
    private readonly trials: TrialWriterService,
    private readonly settlements: SettlementWriterService
  ) {}

  @AllowAnonymous()
  @Get('billing/plans')
  @ZodResponse({ type: PlansDto })
  plans() {
    return this.subscriptions.plans();
  }

  @Get('me/billing')
  @ZodResponse({ type: BillingStatusDto })
  status(@CurrentUserId() userId: string) {
    return this.subscriptions.status(userId);
  }

  @Get('me/billing/history')
  @ZodResponse({ type: PaymentHistoryDto })
  history(@CurrentUserId() userId: string) {
    return this.subscriptions.history(userId);
  }

  @Post('me/billing/checkout')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CheckoutResultDto })
  createCheckout(@CurrentUserId() userId: string, @Body() { plan, promoCode }: CheckoutDto) {
    return this.checkout.createCheckout({ userId, plan, promoCode });
  }

  @Post('me/billing/trial')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: BillingStatusDto })
  startTrial(@CurrentUserId() userId: string) {
    return this.trials.start(userId);
  }

  @Post('me/billing/cancel')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: BillingStatusDto })
  cancelAutoRenew(@CurrentUserId() userId: string) {
    return this.subscriptions.setAutoRenew({ userId, isEnabled: false });
  }

  @Post('me/billing/resume')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: BillingStatusDto })
  resumeAutoRenew(@CurrentUserId() userId: string) {
    return this.subscriptions.setAutoRenew({ userId, isEnabled: true });
  }

  @Post('me/billing/promo')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: BillingStatusDto })
  async redeemPromo(@CurrentUserId() userId: string, @Body() { code }: PromoRedeemDto) {
    await this.promos.redeemFreeDays({ userId, code });

    return this.subscriptions.status(userId);
  }

  @Post('me/billing/referral')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerReferral(@CurrentUserId() userId: string, @Body() { referrerId }: ReferralDto) {
    await this.referrals.register({ userId, referrerId });
  }

  @AllowAnonymous()
  @SkipThrottle()
  @UseGuards(WebhookIpGuard)
  @Post('billing/webhook')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: WebhookAckDto })
  async webhook(@Body() event: WebhookEventDto) {
    await this.settlements.handle(event);

    return { received: true as const };
  }
}
