import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

import { Hocuspocus } from '@hocuspocus/server';
import { Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocketServer } from 'ws';

import type { CollabContext, CollabDocumentHooks } from '../tactics.types';

import { allowedOrigins, AppConfigService } from '../../../config';
import { TACTICS } from '../config/tactics.constants';
import { canEdit } from '../lib/board-access/board-access';
import { boardIdOf, boardSnapshot, encodeBoard, restoreBoard, seedBoardDocument } from '../lib/board-document/board-document';
import { redisConnection } from '../lib/redis-connection/redis-connection';
import { BoardLiveService } from './board-live.service';
import { CollabRedisService } from './collab-redis.service';
import { TacticBoardWriterService } from './tactic-board-writer.service';

@Injectable()
export class TacticsCollabService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TacticsCollabService.name);
  private readonly sockets = new WebSocketServer({ noServer: true, maxPayload: TACTICS.maxPayloadBytes });
  private readonly hocuspocus: Hocuspocus<CollabContext>;
  private allUnloaded: (() => void) | null = null;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly boards: TacticBoardWriterService,
    private readonly config: AppConfigService,
    private readonly auth: AuthService,
    private readonly live: BoardLiveService,
    private readonly redis: CollabRedisService
  ) {
    this.hocuspocus = this.createServer();
    this.live.attach(this.hocuspocus);
  }

  private createServer(): Hocuspocus<CollabContext> {
    return new Hocuspocus<CollabContext>({
      quiet: true,
      extensions: [this.redis.createExtension({ ...redisConnection(this.config.get('REDIS_URL')), prefix: TACTICS.redisPrefix })],
      debounce: TACTICS.debounceMs,
      maxDebounce: TACTICS.maxDebounceMs,
      ...this.documentHooks(),
      afterUnloadDocument: async ({ instance }) => {
        if (instance.getDocumentsCount() === 0) {
          this.allUnloaded?.();
        }
      }
    });
  }

  documentHooks(): CollabDocumentHooks {
    return {
      onAuthenticate: async ({ documentName, token, requestHeaders, connectionConfig }) => {
        const boardId = boardIdOf({ prefix: TACTICS.documentPrefix, name: documentName });

        if (!boardId) {
          throw new Error('Unknown board');
        }

        const session = await this.auth.api.getSession({ headers: requestHeaders }).catch(() => null);
        const { role } = await this.boards.access({ id: boardId, userId: session?.user.id ?? null, token: token || null });

        connectionConfig.readOnly = !canEdit(role);

        return { boardId };
      },
      onLoadDocument: async ({ document, context }) => {
        const { state, data } = await this.boards.loadState(context.boardId);

        if (state) {
          restoreBoard({ document, state });
        } else {
          seedBoardDocument({ document, data });
        }

        return document;
      },
      onStoreDocument: async ({ document, documentName }) => {
        const boardId = boardIdOf({ prefix: TACTICS.documentPrefix, name: documentName });

        const state = encodeBoard(document);

        if (state.byteLength > TACTICS.maxDocumentBytes) {
          this.logger.warn(`board ${documentName} is ${state.byteLength} bytes, over the limit, not stored`);

          return;
        }

        if (boardId) {
          await this.boards.storeState({ id: boardId, state, snapshot: boardSnapshot(document) });
        }
      }
    };
  }

  onApplicationBootstrap(): void {
    const server = this.adapterHost.httpAdapter?.getHttpServer();

    if (!server) {
      return;
    }

    const origins = allowedOrigins({ CORS_ORIGINS: this.config.get('CORS_ORIGINS'), WEB_URL: this.config.get('WEB_URL') });

    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const url = new URL(request.url ?? '/', 'http://localhost');

      if (url.pathname !== TACTICS.path) {
        return;
      }

      if (request.headers.origin && !origins.includes(request.headers.origin)) {
        socket.destroy();

        return;
      }

      socket.on('error', () => socket.destroy());

      this.sockets.handleUpgrade(request, socket, head, (websocket) => {
        const headers = new Headers();

        for (const [key, value] of Object.entries(request.headers)) {
          if (typeof value === 'string') {
            headers.set(key, value);
          }
        }

        const connection = this.hocuspocus.handleConnection(websocket, new Request(url.href, { headers }));

        websocket.on('message', (data: Buffer) => connection.handleMessage(new Uint8Array(data)));
        websocket.on('close', () => connection.handleClose());

        websocket.on('error', (error) => {
          this.logger.warn(`tactics socket dropped: ${error.message}`);
          websocket.terminate();
        });
      });
    });

    this.logger.log(`tactics boards collaborate at ${TACTICS.path}`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.unloadDocuments();
    this.sockets.close();
    await this.hocuspocus.hooks('onDestroy', { instance: this.hocuspocus });
  }

  private async unloadDocuments(): Promise<void> {
    if (this.hocuspocus.getDocumentsCount() === 0) {
      return;
    }

    const unloaded = new Promise<void>((resolve) => {
      this.allUnloaded = resolve;
    });

    this.hocuspocus.closeConnections();
    this.hocuspocus.flushPendingStores();

    await Promise.race([unloaded, delay(TACTICS.shutdownTimeoutMs, undefined, { ref: false })]);
  }
}
