import { resolve } from 'node:path';

import { MODPACK_RELEASES_SOURCE } from '../config/modpack-releases.constants';
import { MODPACK_RELEASES_TOKENS } from '../config/tokens.constants';

export const releaseIndexPathProvider = {
  provide: MODPACK_RELEASES_TOKENS.indexPath,
  useFactory: () => resolve(MODPACK_RELEASES_SOURCE.indexPath)
};
