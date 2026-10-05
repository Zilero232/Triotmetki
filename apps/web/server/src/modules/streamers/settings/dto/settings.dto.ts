import {
  applyRequestSchema,
  createApplyRequestSchema,
  modApplyListSchema,
  saveStreamerSettingsSchema,
  settingsAggregatesQuerySchema,
  settingsAggregatesSchema,
  settingsCompareQuerySchema,
  settingsCompareSchema,
  settingsHistorySchema,
  settingsShareSchema,
  settingsTableSchema,
  streamerSettingsViewSchema,
  updateSettingsShareSchema
} from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

import { applyListSchema, settingsShareResponseSchema } from './settings.schemas';

export class StreamerSettingsViewDto extends createZodDto(streamerSettingsViewSchema) {}
export class SaveStreamerSettingsDto extends createZodDto(saveStreamerSettingsSchema) {}
export class SettingsHistoryDto extends createZodDto(settingsHistorySchema) {}
export class SettingsTableDto extends createZodDto(settingsTableSchema) {}
export class SettingsCompareQueryDto extends createZodDto(settingsCompareQuerySchema) {}
export class SettingsCompareDto extends createZodDto(settingsCompareSchema) {}
export class SettingsAggregatesQueryDto extends createZodDto(settingsAggregatesQuerySchema) {}
export class SettingsAggregatesDto extends createZodDto(settingsAggregatesSchema) {}
export class CreateApplyRequestDto extends createZodDto(createApplyRequestSchema) {}
export class ApplyRequestDto extends createZodDto(applyRequestSchema) {}
export class ApplyListDto extends createZodDto(applyListSchema) {}
export class SettingsShareDto extends createZodDto(settingsShareSchema) {}
export class SettingsShareResponseDto extends createZodDto(settingsShareResponseSchema) {}
export class UpdateSettingsShareDto extends createZodDto(updateSettingsShareSchema) {}
export class ModApplyListDto extends createZodDto(modApplyListSchema) {}
