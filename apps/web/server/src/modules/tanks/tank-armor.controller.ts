import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import type { UsageActor } from '../usage';

import { ARMOR_VIEWER } from '../../config';
import { CurrentUsageActor, MeteredUsage } from '../usage';
import { TankArmorDto, TankArmorGunsDto, TankLookupParamsDto } from './dto/tanks.dto';
import { TankArmorReaderService } from './services/tank-armor-reader.service';

@ApiTags('tanks')
@AllowAnonymous()
@Controller('tanks')
export class TankArmorController {
  constructor(private readonly armorModels: TankArmorReaderService) {}

  @Get(':idOrSlug/armor')
  @MeteredUsage()
  @Header('Cache-Control', ARMOR_VIEWER.cacheControl)
  @ZodResponse({ type: TankArmorDto })
  armor(@Param() { idOrSlug }: TankLookupParamsDto, @CurrentUsageActor() actor: UsageActor) {
    return this.armorModels.open({ idOrSlug, actor });
  }

  @Get(':idOrSlug/armor/guns')
  @Header('Cache-Control', ARMOR_VIEWER.gunsCacheControl)
  @ZodResponse({ type: TankArmorGunsDto })
  guns(@Param() { idOrSlug }: TankLookupParamsDto) {
    return this.armorModels.guns(idOrSlug);
  }
}
