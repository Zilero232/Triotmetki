import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import {
  AddWatchlistPlayerDto,
  UpdateWatchlistSettingsDto,
  WatchlistDto,
  WatchlistPlayerParamsDto,
  WatchlistQueryDto,
  WatchlistSettingsDto
} from './dto/watchlist.dto';
import { WatchlistWriterService } from './services/watchlist-writer.service';

@ApiTags('watchlist')
@Controller('me/watchlist')
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistWriterService) {}

  @Get()
  @ZodResponse({ type: WatchlistDto })
  list(@CurrentUserId() userId: string, @Query() query: WatchlistQueryDto) {
    return this.watchlist.list({ userId, query });
  }

  @Post()
  @ZodResponse({ type: WatchlistDto, status: HttpStatus.CREATED })
  add(@CurrentUserId() userId: string, @Body() body: AddWatchlistPlayerDto) {
    return this.watchlist.add({ ...body, userId });
  }

  @Put('settings')
  @ZodResponse({ type: WatchlistSettingsDto })
  updateSettings(@CurrentUserId() userId: string, @Body() body: UpdateWatchlistSettingsDto) {
    return this.watchlist.updateSettings({ ...body, userId });
  }

  @Delete(':accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: string, @Param() { accountId }: WatchlistPlayerParamsDto) {
    await this.watchlist.remove({ userId, accountId });
  }
}
