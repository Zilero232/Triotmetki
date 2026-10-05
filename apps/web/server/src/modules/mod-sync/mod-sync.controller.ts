import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Controller, HttpCode, HttpStatus, Post, Put, Req } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { modProfilesWriteRequestSchema, modSetsWriteRequestSchema, modSyncReadRequestSchema } from '@otmetki/schemas';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ModDeviceService } from '../mod';
import { MOD_SYNC_API } from './config/mod-sync.constants';
import {
  ModProfilesLibraryDto,
  ModProfilesWriteRequestDto,
  ModSetsLibraryDto,
  ModSetsWriteRequestDto,
  ModSyncReadRequestDto
} from './dto/mod-sync.dto';
import { ModSyncWriterService } from './services/mod-sync-writer.service';

@ApiTags('mod')
@AllowAnonymous()
@Throttle({ default: MOD_SYNC_API.throttle })
@Controller('mod/me')
export class ModSyncController {
  constructor(
    private readonly devices: ModDeviceService,
    private readonly sync: ModSyncWriterService
  ) {}

  @Post('sets')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ModSyncReadRequestDto })
  @ZodResponse({ type: ModSetsLibraryDto })
  async sets(@Req() request: RawBodyRequest<Request>) {
    const { device } = await this.devices.authenticateBody({ request, schema: modSyncReadRequestSchema });

    return this.sync.sets(device.userId);
  }

  @Put('sets')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ModSetsWriteRequestDto })
  @ZodResponse({ type: ModSetsLibraryDto })
  async saveSets(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modSetsWriteRequestSchema });

    return this.sync.saveSets({ userId: device.userId, body });
  }

  @Post('profiles')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ModSyncReadRequestDto })
  @ZodResponse({ type: ModProfilesLibraryDto })
  async profiles(@Req() request: RawBodyRequest<Request>) {
    const { device } = await this.devices.authenticateBody({ request, schema: modSyncReadRequestSchema });

    return this.sync.profiles(device.userId);
  }

  @Put('profiles')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ModProfilesWriteRequestDto })
  @ZodResponse({ type: ModProfilesLibraryDto })
  async saveProfiles(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modProfilesWriteRequestSchema });

    return this.sync.saveProfiles({ userId: device.userId, body });
  }
}
