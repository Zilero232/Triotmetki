import { HttpException } from '@nestjs/common';

import type { ModExceptionInput } from './mod.exception.types';

export class ModException extends HttpException {
  constructor({ status, error, message }: ModExceptionInput) {
    super({ error, ...(message ? { message } : {}) }, status);
  }
}
