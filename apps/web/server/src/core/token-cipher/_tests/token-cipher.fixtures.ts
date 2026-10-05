import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env/env.types';

import { AppConfigService } from '../../../config';
import { TokenCipherService } from '../token-cipher.service';

export const createTokenCipher = (secret = 'token-cipher-test-secret-of-32-chars') =>
  new TokenCipherService(new AppConfigService(new ConfigService<Env, true>({ TOKEN_ENCRYPTION_SECRET: secret })));
