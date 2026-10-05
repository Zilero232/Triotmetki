import {
  bindCodeInputSchema,
  bindCodeSchema,
  modDevicesSchema,
  modOverviewSchema,
  modRatingsRequestSchema,
  modTankRatingsRequestSchema,
  modTankRatingsSchema
} from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

import { bindRequestSchema, bindResponseSchema, ingestResponseSchema } from '../lib/contract';
import { deviceParamsSchema } from './mod.schemas';

export class BindCodeInputDto extends createZodDto(bindCodeInputSchema) {}
export class BindCodeDto extends createZodDto(bindCodeSchema) {}
export class BindRequestDto extends createZodDto(bindRequestSchema) {}
export class BindResponseDto extends createZodDto(bindResponseSchema) {}
export class IngestResponseDto extends createZodDto(ingestResponseSchema) {}
export class ModDevicesDto extends createZodDto(modDevicesSchema) {}
export class DeviceParamsDto extends createZodDto(deviceParamsSchema) {}
export class ModOverviewDto extends createZodDto(modOverviewSchema) {}
export class ModTankRatingsDto extends createZodDto(modTankRatingsSchema) {}
export class ModRatingsRequestDto extends createZodDto(modRatingsRequestSchema) {}
export class ModTankRatingsRequestDto extends createZodDto(modTankRatingsRequestSchema) {}
