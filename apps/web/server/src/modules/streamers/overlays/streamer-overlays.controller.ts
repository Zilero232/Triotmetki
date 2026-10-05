import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix } from '../../../common/decorators';
import { IdParamsDto } from '../dto/params.dto';
import { CreateOverlayDto, OverlayDataDto, OverlayDto, OverlayListDto, PreviewOverlayDto, UpdateOverlayDto } from './dto/overlays.dto';
import { OverlayWriterService } from './services/overlay-writer.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerOverlaysController {
  constructor(private readonly overlays: OverlayWriterService) {}

  @Get('me/overlays')
  @ZodResponse({ type: OverlayListDto })
  listOverlays(@CurrentUserId() userId: string) {
    return this.overlays.list(userId);
  }

  @Post('me/overlays')
  @ZodResponse({ type: OverlayDto, status: HttpStatus.CREATED })
  createOverlay(@CurrentUserId() userId: string, @Body() body: CreateOverlayDto) {
    return this.overlays.create({ ...body, userId });
  }

  @Post('me/overlays/preview')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: OverlayDataDto })
  previewOverlay(@CurrentUserId() userId: string, @Body() body: PreviewOverlayDto) {
    return this.overlays.preview({ ...body, userId });
  }

  @Patch('me/overlays/:id')
  @ZodResponse({ type: OverlayDto })
  updateOverlay(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: UpdateOverlayDto) {
    return this.overlays.update({ ...body, userId, id });
  }

  @Delete('me/overlays/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOverlay(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    await this.overlays.remove({ userId, id });
  }
}
