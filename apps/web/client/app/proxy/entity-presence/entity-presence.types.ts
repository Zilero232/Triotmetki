import type { NextRequest } from 'next/server';

import type { Locale } from '@/shared/i18n';

export type EntityLoadInput = {
  key: string;
  signal: AbortSignal;
  headers: Record<string, string>;
};

export type EntityLookup = {
  pattern: RegExp;
  canonicalKey: (input: EntityLoadInput) => Promise<string | null>;
};

export type EntityLookupInput<T> = {
  pattern: RegExp;
  load: (input: EntityLoadInput) => Promise<{ data: T }>;
  canonicalKey?: (data: T) => string;
};

export type EntityCheckInput = {
  path: string;
  clientIp: string | null;
};

export type EntityCheck = {
  isMissing: boolean;
  canonicalPath: string | null;
};

export type ResolveLookupInput = {
  lookup: EntityLookup;
  rawKey: string;
  path: string;
  headers: Record<string, string>;
};

export type CanonicalPathInput = {
  path: string;
  rawKey: string;
  canonicalKey: string;
};

export type LocalizedPath = {
  locale: Locale;
  path: string;
};

export type MissingEntityRewriteInput = {
  request: NextRequest;
  locale: Locale;
};

export type CanonicalRedirectInput = LocalizedPath & {
  request: NextRequest;
};
