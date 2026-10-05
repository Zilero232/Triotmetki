import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createHash, randomBytes } from 'node:crypto';

import type { ConsumeOAuthStateInput, IssuedOAuthState, OAuthStateInput } from '../integrations.types';

import { timingSafeEqual } from '../../../../common/lib';
import { REDIS } from '../../../../core';
import { OAUTH_STATE } from '../config/integrations.constants';
import { oauthStateSchema } from '../dto/integrations.schemas';

@Injectable()
export class OAuthStateService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create({ provider, userId }: OAuthStateInput): Promise<IssuedOAuthState> {
    const state = randomBytes(OAUTH_STATE.bytes).toString('base64url');
    const binding = randomBytes(OAUTH_STATE.bytes).toString('base64url');

    await this.redis.set(
      `${OAUTH_STATE.prefix}${state}`,
      JSON.stringify({ provider, userId, binding: this.digest(binding) }),
      'EX',
      OAUTH_STATE.ttlSeconds
    );

    return { state, binding };
  }

  async consume({ state, binding }: ConsumeOAuthStateInput): Promise<OAuthStateInput | null> {
    const raw = await this.redis.getdel(`${OAUTH_STATE.prefix}${state}`);

    if (!raw || !binding) {
      return null;
    }

    const parsed = oauthStateSchema.safeParse(raw);

    if (!parsed.success) {
      return null;
    }

    if (!timingSafeEqual({ left: parsed.data.binding, right: this.digest(binding) })) {
      return null;
    }

    return { provider: parsed.data.provider, userId: parsed.data.userId };
  }

  private digest(binding: string): string {
    return createHash('sha256').update(binding).digest('hex');
  }
}
