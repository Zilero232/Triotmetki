import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';

import { Controller, Get, Param, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { OverlayDataDto, OverlayParamsDto } from './dto/overlays.dto';
import { OverlayDataReaderService } from './services/overlay-data-reader.service';
import { OverlayStreamService } from './services/overlay-stream.service';

@ApiTags('overlays')
@AllowAnonymous()
@Controller('overlays')
export class OverlaysController {
  constructor(
    private readonly data: OverlayDataReaderService,
    private readonly streams: OverlayStreamService
  ) {}

  @Get(':publicId')
  @ZodResponse({ type: OverlayDataDto })
  show(@Param() { publicId }: OverlayParamsDto) {
    return this.data.cached(publicId);
  }

  @SkipThrottle()
  @Sse(':publicId/stream')
  stream(@Param() { publicId }: OverlayParamsDto): Observable<MessageEvent> {
    return this.streams.stream(publicId);
  }
}
