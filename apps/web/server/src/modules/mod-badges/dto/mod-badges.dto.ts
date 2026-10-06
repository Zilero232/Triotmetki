import { modBadgePreferenceAnswerSchema, modBadgePreferenceSchema, modBadgesRequestSchema, modBadgesSchema } from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

export class ModBadgesRequestDto extends createZodDto(modBadgesRequestSchema) {}
export class ModBadgesDto extends createZodDto(modBadgesSchema) {}
export class ModBadgePreferenceDto extends createZodDto(modBadgePreferenceSchema) {}
export class ModBadgePreferenceAnswerDto extends createZodDto(modBadgePreferenceAnswerSchema) {}
