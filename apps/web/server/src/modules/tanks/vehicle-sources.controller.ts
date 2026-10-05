import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { VEHICLE_SOURCES } from './config/vehicle-sources.constants';
import { CreateVehicleSourceDto, VehicleSourceDto, VehicleSourceIdParamsDto } from './dto/vehicle-sources.dto';
import { VehicleSourcesService } from './services/vehicle-sources.service';

@ApiTags('tanks')
@Controller('admin/vehicle-sources')
export class VehicleSourcesController {
  constructor(private readonly sources: VehicleSourcesService) {}

  @Roles([...VEHICLE_SOURCES.editorRoles])
  @Post()
  @ZodResponse({ type: VehicleSourceDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Body() input: CreateVehicleSourceDto) {
    return this.sources.create({ userId, input });
  }

  @Roles([...VEHICLE_SOURCES.editorRoles])
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param() { id }: VehicleSourceIdParamsDto) {
    await this.sources.remove(id);
  }
}
