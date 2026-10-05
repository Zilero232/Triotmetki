import {
  createOverlaySchema,
  overlayDataSchema,
  overlayListSchema,
  overlaySchema,
  previewOverlaySchema,
  updateOverlaySchema
} from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

import { overlayParamsSchema } from './overlays.schemas';

export class OverlayDto extends createZodDto(overlaySchema) {}
export class OverlayListDto extends createZodDto(overlayListSchema) {}
export class CreateOverlayDto extends createZodDto(createOverlaySchema) {}
export class UpdateOverlayDto extends createZodDto(updateOverlaySchema) {}
export class PreviewOverlayDto extends createZodDto(previewOverlaySchema) {}
export class OverlayParamsDto extends createZodDto(overlayParamsSchema) {}
export class OverlayDataDto extends createZodDto(overlayDataSchema) {}
