import { CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous, OptionalAuth } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import type { ModUploadRequest } from './interceptors/replay-file.interceptor.types';
import type { UploadedReplayFile } from './replays.types';

import { CACHE_TTL } from '../../common/cache';
import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { REPLAY_UPLOAD } from './config/upload.constants';
import {
  BestOfWeekDto,
  BestOfWeekQueryDto,
  HeatmapDto,
  HeatmapParamsDto,
  HeatmapQueryDto,
  PaginationQueryDto,
  ReplayDto,
  ReplayIdParamsDto,
  ReplayPageDto,
  ReplaySearchQueryDto,
  ReplayTracksDto,
  ReplayVersionsDto,
  UpdateReplayDto,
  UploadedReplayDto,
  UploadReplayDto
} from './dto/replays.dto';
import { ModDeviceGuard } from './guards/mod-device.guard';
import { ModReplayFileInterceptor } from './interceptors/mod-replay-file.interceptor';
import { ReplayFileInterceptor } from './interceptors/replay-file.interceptor';
import { HeatmapReaderService } from './services/heatmap-reader.service';
import { ReplayOwnerWriterService } from './services/replay-owner-writer.service';
import { ReplayReaderService } from './services/replay-reader.service';
import { ReplayUploadWriterService } from './services/replay-upload-writer.service';

@ApiTags('replays')
@Controller('replays')
export class ReplaysController {
  constructor(
    private readonly uploads: ReplayUploadWriterService,
    private readonly queries: ReplayReaderService,
    private readonly owners: ReplayOwnerWriterService,
    private readonly heatmaps: HeatmapReaderService
  ) {}

  @Post()
  @Throttle({ default: REPLAY_UPLOAD.userThrottle })
  @UseInterceptors(ReplayFileInterceptor)
  @ApiConsumes('multipart/form-data')
  @ZodResponse({ type: UploadedReplayDto, status: HttpStatus.CREATED })
  upload(@CurrentUserId() userId: string, @UploadedFile() file: UploadedReplayFile | undefined, @Body() { visibility }: UploadReplayDto) {
    return this.uploads.upload({ file, uploaderUserId: userId, deviceId: null, visibility });
  }

  @AllowAnonymous()
  @Post('mod')
  @Throttle({ default: REPLAY_UPLOAD.modThrottle })
  @UseGuards(ModDeviceGuard)
  @UseInterceptors(ModReplayFileInterceptor)
  @ApiConsumes('multipart/form-data')
  @ZodResponse({ type: UploadedReplayDto, status: HttpStatus.CREATED })
  uploadFromMod(@UploadedFile() file: UploadedReplayFile | undefined, @Req() request: ModUploadRequest) {
    return this.uploads.uploadFromMod({ file, device: request.modDevice, visibility: request.header(REPLAY_UPLOAD.visibilityHeader) });
  }

  @AllowAnonymous()
  @Get()
  @ZodResponse({ type: ReplayPageDto })
  search(@Query() query: ReplaySearchQueryDto) {
    return this.queries.search(query);
  }

  @AllowAnonymous()
  @Get('best')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: BestOfWeekDto })
  best(@Query() { week }: BestOfWeekQueryDto) {
    return this.queries.bestOfWeek(week);
  }

  @AllowAnonymous()
  @Get('versions')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: ReplayVersionsDto })
  versions() {
    return this.queries.versions();
  }

  @Get('mine')
  @ZodResponse({ type: ReplayPageDto })
  mine(@CurrentUserId() userId: string, @Query() { limit, offset }: PaginationQueryDto) {
    return this.queries.mine({ userId, limit, offset });
  }

  @AllowAnonymous()
  @Get('heatmaps/:arenaId')
  @ZodResponse({ type: HeatmapDto })
  heatmap(@Param() { arenaId }: HeatmapParamsDto, @Query() { mode, scope }: HeatmapQueryDto) {
    return this.heatmaps.get({ arenaId, mode, scope });
  }

  @OptionalAuth()
  @Get(':id')
  @ZodResponse({ type: ReplayDto })
  get(@Param() { id }: ReplayIdParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.queries.get({ id, viewerUserId });
  }

  @OptionalAuth()
  @Get(':id/tracks')
  @ZodResponse({ type: ReplayTracksDto })
  tracks(@Param() { id }: ReplayIdParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.queries.tracks({ id, viewerUserId });
  }

  @OptionalAuth()
  @Get(':id/file')
  async file(@Param() { id }: ReplayIdParamsDto, @OptionalUserId() viewerUserId: string | null) {
    const { fileName, bytes } = await this.queries.file({ id, viewerUserId });

    return new StreamableFile(bytes, {
      type: REPLAY_UPLOAD.contentType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      length: bytes.byteLength
    });
  }

  @Patch(':id')
  @ZodResponse({ type: ReplayDto })
  update(@CurrentUserId() userId: string, @Param() { id }: ReplayIdParamsDto, @Body() { visibility }: UpdateReplayDto) {
    return this.owners.updateVisibility({ id, userId, visibility });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: string, @Param() { id }: ReplayIdParamsDto) {
    await this.owners.remove({ id, userId });
  }
}
