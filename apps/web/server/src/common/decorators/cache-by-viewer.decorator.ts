import { SetMetadata } from '@nestjs/common';

import { CACHE_BY_VIEWER } from '../cache';

export const CacheByViewer = () => SetMetadata(CACHE_BY_VIEWER, true);
