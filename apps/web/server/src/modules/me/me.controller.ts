import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import {
  CreateFavoriteDto,
  CreateGoalDto,
  FavoriteDto,
  FavoritesDto,
  GoalDto,
  GoalsDto,
  IdParamsDto,
  LestaAccountParamsDto,
  LinkedAccountsDto,
  MyMarksDto,
  NotificationSettingsDto,
  UpdateGoalDto,
  UpdateNotificationSettingsDto
} from './dto/me.dto';
import { FavoritesWriterService } from './services/favorites-writer.service';
import { GoalsWriterService } from './services/goals-writer.service';
import { LinkedAccountsWriterService } from './services/linked-accounts-writer.service';
import { MyMarksReaderService } from './services/my-marks-reader.service';
import { NotificationSettingsWriterService } from './services/notification-settings-writer.service';

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(
    private readonly favorites: FavoritesWriterService,
    private readonly goals: GoalsWriterService,
    private readonly notifications: NotificationSettingsWriterService,
    private readonly accounts: LinkedAccountsWriterService,
    private readonly myMarks: MyMarksReaderService
  ) {}

  @Get('marks')
  @ZodResponse({ type: MyMarksDto })
  marks(@CurrentUserId() userId: string) {
    return this.myMarks.marks(userId);
  }

  @Get('favorites')
  @ZodResponse({ type: FavoritesDto })
  listFavorites(@CurrentUserId() userId: string) {
    return this.favorites.list(userId);
  }

  @Post('favorites')
  @ZodResponse({ type: FavoriteDto, status: HttpStatus.CREATED })
  addFavorite(@CurrentUserId() userId: string, @Body() body: CreateFavoriteDto) {
    return this.favorites.create({ ...body, userId });
  }

  @Delete('favorites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    await this.favorites.remove({ userId, id });
  }

  @Get('goals')
  @ZodResponse({ type: GoalsDto })
  listGoals(@CurrentUserId() userId: string) {
    return this.goals.list(userId);
  }

  @Post('goals')
  @ZodResponse({ type: GoalDto, status: HttpStatus.CREATED })
  addGoal(@CurrentUserId() userId: string, @Body() body: CreateGoalDto) {
    return this.goals.create({ ...body, userId });
  }

  @Patch('goals/:id')
  @ZodResponse({ type: GoalDto })
  updateGoal(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: UpdateGoalDto) {
    return this.goals.update({ ...body, userId, id });
  }

  @Delete('goals/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGoal(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    await this.goals.remove({ userId, id });
  }

  @Get('notifications')
  @ZodResponse({ type: NotificationSettingsDto })
  notificationSettings(@CurrentUserId() userId: string) {
    return this.notifications.get(userId);
  }

  @Put('notifications')
  @ZodResponse({ type: NotificationSettingsDto })
  replaceNotificationSettings(@CurrentUserId() userId: string, @Body() body: NotificationSettingsDto) {
    return this.notifications.update({ ...body, userId });
  }

  @Patch('notifications')
  @ZodResponse({ type: NotificationSettingsDto })
  updateNotificationSettings(@CurrentUserId() userId: string, @Body() body: UpdateNotificationSettingsDto) {
    return this.notifications.update({ ...body, userId });
  }

  @Get('accounts')
  @ZodResponse({ type: LinkedAccountsDto })
  linkedAccounts(@CurrentUserId() userId: string) {
    return this.accounts.get(userId);
  }

  @Post('accounts/lesta/:accountId/primary')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: LinkedAccountsDto })
  makePrimary(@CurrentUserId() userId: string, @Param() { accountId }: LestaAccountParamsDto) {
    return this.accounts.makePrimary({ userId, accountId });
  }

  @Delete('accounts/lesta/:accountId')
  @ZodResponse({ type: LinkedAccountsDto })
  unlink(@CurrentUserId() userId: string, @Param() { accountId }: LestaAccountParamsDto) {
    return this.accounts.unlink({ userId, accountId });
  }
}
