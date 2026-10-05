import { Injectable } from '@nestjs/common';
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';

import { AppConfigService } from '../../config';
import { TOKEN_CIPHER } from './token-cipher.constants';

@Injectable()
export class TokenCipherService {
  private readonly key: string;

  constructor(config: AppConfigService) {
    this.key = config.get('TOKEN_ENCRYPTION_SECRET');
  }

  async seal(token: string): Promise<string> {
    return `${TOKEN_CIPHER.prefix}${await symmetricEncrypt({ key: this.key, data: token })}`;
  }

  async open(stored: string): Promise<string> {
    if (!stored.startsWith(TOKEN_CIPHER.prefix)) {
      return stored;
    }

    return symmetricDecrypt({ key: this.key, data: stored.slice(TOKEN_CIPHER.prefix.length) });
  }
}
