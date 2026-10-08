import { HttpException } from '@nestjs/common';

import type { ModExceptionInput } from './mod.exception.types';

export class ModException extends HttpException {
  readonly retryAfterSeconds: number | null;

  constructor({ status, error, message, retryAfterSeconds }: ModExceptionInput) {
    super({ error, ...(message ? { message } : {}) }, status);
    this.retryAfterSeconds = retryAfterSeconds ?? null;
  }
}
