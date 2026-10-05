import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import type { Request, Response } from 'express';

import express from 'express';
import { lastValueFrom, of } from 'rxjs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { REPLAY_UPLOAD } from '../../../config';
import { ReplayFileInterceptor } from '../replay-file.interceptor';

const contextOf = ({ req, res }: { req: Request; res: Response }) => {
  const context = mock<ExecutionContext>();

  const http = mock<HttpArgumentsHost>();

  http.getRequest.mockReturnValue(req);
  http.getResponse.mockReturnValue(res);
  context.switchToHttp.mockReturnValue(http);

  return context;
};

const appWithInterceptor = () => {
  const interceptor = new ReplayFileInterceptor();
  const app = express();

  app.post('/replays', (req, res) => {
    const next = mock<CallHandler>();

    next.handle.mockReturnValue(of(null));

    Promise.resolve(interceptor.intercept(contextOf({ req, res }), next))
      .then(lastValueFrom)
      .then(
        () => res.status(200).end(),
        (error: { status?: number }) => res.status(error.status ?? 500).end()
      );
  });

  return app;
};

describe('ReplayFileInterceptor', () => {
  it('accepts a replay with the visibility field', async () => {
    const response = await request(appWithInterceptor())
      .post('/replays')
      .field('visibility', 'public')
      .attach(REPLAY_UPLOAD.field, Buffer.from('replay'), 'battle.mtreplay');

    expect(response.status).toBe(200);
  });

  it('refuses a request stuffed with form fields instead of buffering them all in memory', async () => {
    let upload = request(appWithInterceptor()).post('/replays');

    for (let index = 0; index < 20; index += 1) {
      upload = upload.field(`junk${index}`, 'x');
    }

    const response = await upload.attach(REPLAY_UPLOAD.field, Buffer.from('replay'), 'battle.mtreplay');

    expect(response.status).toBe(400);
  });

  it('refuses an oversized text field', async () => {
    const response = await request(appWithInterceptor())
      .post('/replays')
      .field('visibility', 'x'.repeat(64 * 1024))
      .attach(REPLAY_UPLOAD.field, Buffer.from('replay'), 'battle.mtreplay');

    expect(response.status).toBe(400);
  });
});
