import { Controller, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { ModSyncLibrariesDto } from './dto/mod-sync.dto';
import { ModSyncWriterService } from './services/mod-sync-writer.service';

@ApiTags('mod')
@Controller('mod/sync')
export class ModSyncAccountController {
  constructor(private readonly sync: ModSyncWriterService) {}

  @Get()
  @ZodResponse({ type: ModSyncLibrariesDto })
  libraries(@CurrentUserId() userId: string) {
    return this.sync.libraries(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(@CurrentUserId() userId: string) {
    await this.sync.clear(userId);
  }
}
