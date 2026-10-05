import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { RequiresPlus } from '../billing';
import { AccountParamsDto, SeasonHistoryDto, SeasonTrackDto, ShellsDto, TankChallengesDto, TankProgressListDto } from './dto/progression.dto';
import { SeasonReaderService } from './services/season-reader.service';
import { ShellLedgerWriterService } from './services/shell-ledger-writer.service';
import { TankProgressReaderService } from './services/tank-progress-reader.service';

@ApiTags('progression')
@Controller()
export class ProgressionController {
  constructor(
    private readonly tanks: TankProgressReaderService,
    private readonly seasons: SeasonReaderService,
    private readonly shells: ShellLedgerWriterService
  ) {}

  @Get('me/progression/tanks')
  @ZodResponse({ type: TankProgressListDto })
  tankLevels(@CurrentUserId() userId: string) {
    return this.tanks.list(userId);
  }

  @Get('me/progression/challenges')
  @RequiresPlus('progression')
  @ZodResponse({ type: TankChallengesDto })
  challenges(@CurrentUserId() userId: string) {
    return this.tanks.challenges({ userId, now: new Date() });
  }

  @Get('me/progression/season')
  @ZodResponse({ type: SeasonTrackDto })
  season(@CurrentUserId() userId: string) {
    return this.seasons.track({ userId, now: new Date() });
  }

  @Get('me/progression/shells')
  @ZodResponse({ type: ShellsDto })
  shellLedger(@CurrentUserId() userId: string) {
    return this.shells.summary(userId);
  }

  @AllowAnonymous()
  @Get('players/:id/seasons')
  @ZodResponse({ type: SeasonHistoryDto })
  seasonHistory(@Param() { id }: AccountParamsDto) {
    return this.seasons.history(id);
  }
}
