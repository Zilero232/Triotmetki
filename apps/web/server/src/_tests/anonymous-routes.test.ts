import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = path.resolve(import.meta.dirname, '..');
const AUTH_METADATA = { anonymous: 'PUBLIC', optional: 'OPTIONAL' } as const;
const WRITE_METHODS = new Set<number>([RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE]);

const ANONYMOUS_WRITE_ROUTES = [
  'PATCH /tactics/boards/:id',
  'POST /billing/webhook',
  'POST /marks/projection',
  'POST /mod/badges',
  'POST /mod/badges/preference',
  'POST /mod/bind',
  'POST /mod/ingest',
  'POST /mod/me/goals',
  'POST /mod/me/overview',
  'POST /mod/me/profiles',
  'POST /mod/me/replays',
  'POST /mod/me/session-share',
  'POST /mod/me/session-share/send',
  'POST /mod/me/sets',
  'POST /mod/me/tanks',
  'POST /mod/reports',
  'POST /mod/settings',
  'POST /mod/settings/apply/:id/result',
  'POST /mod/settings/apply/poll',
  'POST /replays/mod',
  'POST /streamers/:slug/removal-request',
  'POST /tanks/:id/loadout',
  'POST /telegram/web-login',
  'POST /telegram/webhook',
  'POST /vk/callback',
  'PUT /mod/me/profiles',
  'PUT /mod/me/sets'
] as const;

const joinPath = (...parts: unknown[]): string =>
  `/${parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string => typeof part === 'string' && part !== '' && part !== '/')
    .map((part) => part.replace(/^\/+|\/+$/gu, ''))
    .join('/')}`;

const controllerFiles = (): string[] =>
  readdirSync(SOURCE_ROOT, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.controller.ts') && !file.includes('_tests'))
    .map((file) => path.join(SOURCE_ROOT, file));

const anonymousWriteRoutes = async (): Promise<string[]> => {
  const routes: string[] = [];

  for (const file of controllerFiles()) {
    const exported: Record<string, unknown> = await import(pathToFileURL(file).href);

    for (const candidate of Object.values(exported)) {
      if (typeof candidate !== 'function' || Reflect.getMetadata(PATH_METADATA, candidate) === undefined) {
        continue;
      }

      const prefix: unknown = Reflect.getMetadata(PATH_METADATA, candidate);
      const isOpenClass = Object.values(AUTH_METADATA).some((key) => Reflect.getMetadata(key, candidate) === true);

      for (const name of Object.getOwnPropertyNames(candidate.prototype)) {
        const handler: unknown = Reflect.get(candidate.prototype, name);

        if (typeof handler !== 'function' || name === 'constructor') {
          continue;
        }

        const method: unknown = Reflect.getMetadata(METHOD_METADATA, handler);
        const isOpen = isOpenClass || Object.values(AUTH_METADATA).some((key) => Reflect.getMetadata(key, handler) === true);

        if (typeof method === 'number' && WRITE_METHODS.has(method) && isOpen) {
          routes.push(`${RequestMethod[method]} ${joinPath(prefix, Reflect.getMetadata(PATH_METADATA, handler))}`);
        }
      }
    }
  }

  return routes.toSorted();
};

describe('anonymous write routes', () => {
  it('match the reviewed allowlist, so a new unauthenticated write needs a deliberate entry here', async () => {
    expect(await anonymousWriteRoutes()).toEqual([...ANONYMOUS_WRITE_ROUTES].toSorted());
  }, 180_000);
});
