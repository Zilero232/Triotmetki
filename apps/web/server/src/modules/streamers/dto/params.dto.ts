import { createZodDto } from 'nestjs-zod';

import { idParamsSchema, slugParamsSchema } from './params.schemas';

export class SlugParamsDto extends createZodDto(slugParamsSchema) {}
export class IdParamsDto extends createZodDto(idParamsSchema) {}
