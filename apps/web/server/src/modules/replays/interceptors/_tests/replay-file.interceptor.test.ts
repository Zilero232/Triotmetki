import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import type { Request, Response } from 'express';

import express from 'express';
import RedisMock from 'ioredis-mock';
import { existsSync } from 'node:fs';
import { lastValueFrom, Observable, of } from 'rxjs';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { UploadRequest } from '../replay-file.interceptor.types';

import { REPLAY_UPLOAD } from '../../config/upload.constants';
import { ReplayFileInterceptor } from '../replay-file.interceptor';

const contextOf = ({ req, res }: { req: Request; res: Response }) => {
  const context = mock<ExecutionContext>();

  const http = mock<HttpArgumentsHost>();

  http.getRequest.mockReturnValue(req);
  http.getResponse.mockReturnValue(res);
  context.switchToHttp.mockReturnValue(http);

  return context;
};

const appWithInterceptor = (handle: (req: UploadRequest) => Observable<unknown> = () => of(null)) => {
  const interceptor = new ReplayFileInterceptor(new RedisMock());
  const app = express();

  app.post('/replays', (req, res) => {
    const next = mock<CallHandler>();

    next.handle.mockImplementation(() => handle(req));

    Promise.resolve(interceptor.intercept(contextOf({ req, res }), next))
      .then(lastValueFrom)
      .then(
        () => res.status(200).end(),
        (error: { status?: number }) => res.status(error.status ?? 500).end()
      );
  });

  return app;
};

const upload = (app: express.Express) => request(app).post('/replays').attach(REPLAY_UPLOAD.field, Buffer.from('replay'), 'battle.mtreplay');

describe('ReplayFileInterceptor', () => {
  it('accepts a replay with the visibility field', async () => {
    const response = await request(appWithInterceptor())
      .post('/replays')
      .field('visibility', 'public')
      .attach(REPLAY_UPLOAD.field, Buffer.from('replay'), 'battle.mtreplay');

    expect(response.status).toBe(200);
  });

  it('refuses a request stuffed with form fields instead of buffering them all in memory', async () => {
    let stuffed = request(appWithInterceptor()).post('/replays');

    for (let index = 0; index < 20; index += 1) {
      stuffed = stuffed.field(`junk${index}`, 'x');
    }

    const response = await stuffed.attach(REPLAY_UPLOAD.field, Buffer.from('replay'), 'battle.mtreplay');

    expect(response.status).toBe(400);
  });

  it('refuses an oversized text field', async () => {
    const response = await request(appWithInterceptor())
      .post('/replays')
      .field('visibility', 'x'.repeat(64 * 1024))
      .attach(REPLAY_UPLOAD.field, Buffer.from('replay'), 'battle.mtreplay');

    expect(response.status).toBe(400);
  });

  it('spools the replay to a temporary file and removes it once the request is handled', async () => {
    const paths: string[] = [];

    await upload(
      appWithInterceptor((req) => {
        paths.push(req.file?.path ?? '');

        return of(null);
      })
    );

    expect(paths).toHaveLength(1);
    await vi.waitFor(() => expect(existsSync(paths[0] ?? '')).toBe(false));
  });

  it('removes the temporary file when the handler fails', async () => {
    const paths: string[] = [];

    const response = await upload(
      appWithInterceptor((req) => {
        paths.push(req.file?.path ?? '');

        return new Observable((subscriber) => subscriber.error(new Error('storage down')));
      })
    );

    expect(response.status).toBe(500);
    await vi.waitFor(() => expect(existsSync(paths[0] ?? '')).toBe(false));
  });

  it('refuses an upload past the concurrent uploads allowed to one owner', async () => {
    const pending: (() => void)[] = [];
    const app = appWithInterceptor(
      () =>
        new Observable((subscriber) => {
          pending.push(() => {
            subscriber.next(null);
            subscriber.complete();
          });
        })
    );

    const running = Array.from({ length: REPLAY_UPLOAD.concurrency.perOwner }, () => upload(app).then((response) => response.status));

    while (pending.length < REPLAY_UPLOAD.concurrency.perOwner) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const refused = await upload(app);

    pending.forEach((complete) => complete());

    expect(refused.status).toBe(429);
    await expect(Promise.all(running)).resolves.toEqual(Array.from({ length: REPLAY_UPLOAD.concurrency.perOwner }).fill(200));
  });
});
