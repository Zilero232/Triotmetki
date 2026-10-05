import type { OnModuleInit } from '@nestjs/common';
import type { Express } from 'express';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import basicAuth from 'express-basic-auth';

import { AppConfigService, BULL_BOARD } from '../../../config';
import { QueueRegistryService } from '../queues';

@Injectable()
export class BoardService implements OnModuleInit {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly registry: QueueRegistryService,
    private readonly config: AppConfigService
  ) {}

  onModuleInit() {
    const password = this.config.get('BULL_BOARD_PASSWORD');

    if (!password) {
      return;
    }

    const serverAdapter = new ExpressAdapter().setBasePath(BULL_BOARD.route);

    createBullBoard({ queues: this.registry.all().map((queue) => new BullMQAdapter(queue)), serverAdapter });

    this.adapterHost.httpAdapter
      .getInstance<Express>()
      .use(
        BULL_BOARD.route,
        basicAuth({ users: { [BULL_BOARD.user]: password }, challenge: true, realm: BULL_BOARD.realm }),
        serverAdapter.getRouter()
      );
  }
}
