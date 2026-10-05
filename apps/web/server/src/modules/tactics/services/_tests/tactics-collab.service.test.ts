import type { onAuthenticatePayload, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server';
import type { HttpAdapterHost } from '@nestjs/core';
import type { AuthService } from '@thallesp/nestjs-better-auth';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

import { Document } from '@hocuspocus/server';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';
import * as Y from 'yjs';

import type { AppConfigService } from '../../../../config';
import type { BoardAccess, CollabContext } from '../../tactics.types';
import type { CollabRedisService } from '../collab-redis.service';

import { BOARD_DOCUMENT, TACTICS } from '../../config/tactics.constants';
import { BoardLiveService } from '../board-live.service';
import { TacticBoardWriterService } from '../tactic-board-writer.service';
import { TacticsCollabService } from '../tactics-collab.service';

const BOARD_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NAME = `${TACTICS.documentPrefix}${BOARD_ID}`;
const WEB_URL = 'https://otmetki.test';
const layer = { id: 'l1', name: 'Layer', visible: true, strokes: [], icons: [] };

const createCollab = () => {
  const server = new EventEmitter();
  const adapterHost = mockDeep<HttpAdapterHost>();
  const boards = mock<TacticBoardWriterService>();
  const config = mock<AppConfigService>();
  const auth = mockDeep<AuthService>();
  const live = new BoardLiveService();
  const redis = mock<CollabRedisService>();

  adapterHost.httpAdapter.getHttpServer.mockReturnValue(server);
  config.get.mockImplementation((key) => (key === 'WEB_URL' ? WEB_URL : key === 'CORS_ORIGINS' ? '' : 'redis://localhost:6380'));
  auth.api.getSession.mockResolvedValue(null);
  redis.createExtension.mockReturnValue({ extensionName: 'redis-test-double' });

  const attach = vi.spyOn(live, 'attach');
  const collab = new TacticsCollabService(adapterHost, boards, config, auth, live, redis);
  const [hocuspocus] = attach.mock.calls[0] ?? [];

  return { server, auth, boards, live, collab, hocuspocus, hooks: collab.documentHooks() };
};

const authPayload = (documentName: string) => {
  const payload = mock<onAuthenticatePayload<CollabContext>>({ documentName, token: '' });

  payload.requestHeaders = new Headers();
  payload.connectionConfig = { readOnly: false, isAuthenticated: false };

  return payload;
};

const loadPayload = (document: Document) => {
  const payload = mock<onLoadDocumentPayload<CollabContext>>({ context: { boardId: BOARD_ID } });

  payload.document = document;

  return payload;
};

const storePayload = (document: Document) => {
  const payload = mock<onStoreDocumentPayload<CollabContext>>({ documentName: document.name });

  payload.document = document;

  return payload;
};

describe('TacticsCollabService authentication', () => {
  it('rejects a document that is not a board', async () => {
    const { boards, hooks } = createCollab();

    await expect(hooks.onAuthenticate(authPayload('notes:1'))).rejects.toThrow();
    expect(boards.access).not.toHaveBeenCalled();
  });

  it('opens a board read-only for a viewer', async () => {
    const { boards, hooks } = createCollab();
    const payload = authPayload(NAME);

    boards.access.mockResolvedValue(mock<BoardAccess>({ role: 'view' }));

    expect(await hooks.onAuthenticate(payload)).toEqual({ boardId: BOARD_ID });
    expect(payload.connectionConfig.readOnly).toBe(true);
  });

  it('opens a board writable for an editor', async () => {
    const { boards, hooks } = createCollab();
    const payload = authPayload(NAME);

    boards.access.mockResolvedValue(mock<BoardAccess>({ role: 'edit' }));

    await hooks.onAuthenticate(payload);

    expect(payload.connectionConfig.readOnly).toBe(false);
  });

  it('checks access as an anonymous visitor when the session lookup fails', async () => {
    const { auth, boards, hooks } = createCollab();

    auth.api.getSession.mockRejectedValue(new Error('bad cookie'));
    boards.access.mockResolvedValue(mock<BoardAccess>({ role: 'view' }));

    await hooks.onAuthenticate(authPayload(NAME));

    expect(boards.access).toHaveBeenCalledWith({ id: BOARD_ID, userId: null, token: null });
  });

  it('refuses a board the visitor may not open', async () => {
    const { boards, hooks } = createCollab();

    boards.access.mockRejectedValue(new Error('not found'));

    await expect(hooks.onAuthenticate(authPayload(NAME))).rejects.toThrow();
  });
});

describe('TacticsCollabService documents', () => {
  it('restores a stored board state', async () => {
    const { boards, hooks } = createCollab();
    const source = new Y.Doc();

    source.getArray(BOARD_DOCUMENT.layersKey).push([layer]);
    boards.loadState.mockResolvedValue({ state: Y.encodeStateAsUpdate(source), data: { layers: [] } });

    const document = new Document(NAME);

    await hooks.onLoadDocument(loadPayload(document));

    expect(document.getArray(BOARD_DOCUMENT.layersKey).toJSON()).toEqual([layer]);
  });

  it('seeds a board that was never edited live from its saved layers', async () => {
    const { boards, hooks } = createCollab();

    boards.loadState.mockResolvedValue({ state: null, data: { layers: [layer] } });

    const document = new Document(NAME);

    await hooks.onLoadDocument(loadPayload(document));

    expect(document.getArray(BOARD_DOCUMENT.layersKey).toJSON()).toEqual([layer]);
  });

  it('stores the board state with a snapshot of its layers', async () => {
    const { boards, hooks } = createCollab();
    const document = new Document(NAME);

    document.getArray(BOARD_DOCUMENT.layersKey).push([layer]);

    await hooks.onStoreDocument(storePayload(document));

    expect(boards.storeState).toHaveBeenCalledWith(expect.objectContaining({ id: BOARD_ID, snapshot: { layers: [layer] } }));
  });

  it('refuses to store a board over the size limit', async () => {
    const { boards, hooks } = createCollab();
    const document = new Document(NAME);

    document.getArray<Uint8Array>('padding').push([new Uint8Array(TACTICS.maxDocumentBytes + 1)]);

    await hooks.onStoreDocument(storePayload(document));

    expect(boards.storeState).not.toHaveBeenCalled();
  });

  it('does not store a document that is not a board', async () => {
    const { boards, hooks } = createCollab();

    await hooks.onStoreDocument(storePayload(new Document('notes:1')));

    expect(boards.storeState).not.toHaveBeenCalled();
  });
});

describe('TacticsCollabService.onApplicationBootstrap', () => {
  const upgrade = (fields: { url: string; origin?: string }) =>
    mock<IncomingMessage>({ url: fields.url, headers: fields.origin ? { origin: fields.origin } : {} });

  it('drops an upgrade from a foreign origin', () => {
    const { server, collab } = createCollab();
    const socket = mock<Duplex>();

    collab.onApplicationBootstrap();
    server.emit('upgrade', upgrade({ url: TACTICS.path, origin: 'https://evil.test' }), socket, Buffer.alloc(0));

    expect(socket.destroy).toHaveBeenCalled();
  });

  it('leaves upgrades for other paths to their own handlers', () => {
    const { server, collab } = createCollab();
    const socket = mock<Duplex>();

    collab.onApplicationBootstrap();
    server.emit('upgrade', upgrade({ url: '/other', origin: 'https://evil.test' }), socket, Buffer.alloc(0));

    expect(socket.destroy).not.toHaveBeenCalled();
    expect(socket.on).not.toHaveBeenCalled();
  });
});

describe('TacticsCollabService.onApplicationShutdown', () => {
  it('waits for the pending board stores before it lets the app close', async () => {
    const { boards, collab, hocuspocus } = createCollab();
    const stored: string[] = [];

    boards.loadState.mockResolvedValue({ state: null, data: { layers: [] } });

    boards.storeState.mockImplementation(async ({ id }) => {
      await delay(20);
      stored.push(id);
    });

    const document = await hocuspocus!.createDocument(
      NAME,
      new Request(WEB_URL),
      'socket',
      { readOnly: false, isAuthenticated: true },
      { boardId: BOARD_ID }
    );

    document.getArray(BOARD_DOCUMENT.layersKey).push([layer]);

    await collab.onApplicationShutdown();

    expect(stored).toEqual([BOARD_ID]);
  });

  it('closes at once when no board is open', async () => {
    const { boards, collab } = createCollab();

    await collab.onApplicationShutdown();

    expect(boards.storeState).not.toHaveBeenCalled();
  });
});
