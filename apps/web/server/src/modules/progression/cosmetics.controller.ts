import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import {
  AccountParamsDto,
  CosmeticCodeParamsDto,
  CosmeticsInventoryDto,
  EquipCosmeticsDto,
  ProfileCosmeticsDto,
  ProfileCosmeticsListDto,
  ProfileCosmeticsQueryDto
} from './dto/progression.dto';
import { CosmeticsService } from './services/cosmetics.service';

@ApiTags('cosmetics')
@Controller()
export class CosmeticsController {
  constructor(private readonly cosmetics: CosmeticsService) {}

  @Get('me/cosmetics')
  @ZodResponse({ type: CosmeticsInventoryDto })
  inventory(@CurrentUserId() userId: string) {
    return this.cosmetics.inventory(userId);
  }

  @Post('me/cosmetics/:code/purchase')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CosmeticsInventoryDto })
  purchase(@CurrentUserId() userId: string, @Param() { code }: CosmeticCodeParamsDto) {
    return this.cosmetics.purchase({ userId, code });
  }

  @Put('me/cosmetics/equipped')
  @ZodResponse({ type: CosmeticsInventoryDto })
  equip(@CurrentUserId() userId: string, @Body() body: EquipCosmeticsDto) {
    return this.cosmetics.equip({ ...body, userId });
  }

  @AllowAnonymous()
  @Get('players/:id/cosmetics')
  @ZodResponse({ type: ProfileCosmeticsDto })
  profile(@Param() { id }: AccountParamsDto) {
    return this.cosmetics.profile(id);
  }

  @AllowAnonymous()
  @Get('cosmetics/profiles')
  @ZodResponse({ type: ProfileCosmeticsListDto })
  async profiles(@Query() { accountIds }: ProfileCosmeticsQueryDto) {
    return { items: await this.cosmetics.profiles(accountIds) };
  }
}
