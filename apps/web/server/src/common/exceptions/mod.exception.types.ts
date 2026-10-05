import type { ModErrorCode } from '@otmetki/schemas';

export type { ModErrorCode };

export type ModExceptionInput = {
  status: number;
  error: ModErrorCode;
  message?: string;
};
