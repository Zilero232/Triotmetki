import type { PlusFeature } from '@otmetki/schemas';

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { PLUS_GUARD } from '../config/plus-guard.constants';
import { PlusGuard } from '../guards/plus.guard';

export const RequiresPlus = (feature: PlusFeature) => applyDecorators(SetMetadata(PLUS_GUARD.featureKey, feature), UseGuards(PlusGuard));
