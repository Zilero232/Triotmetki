import type { ServersOnline } from '@otmetki/schemas';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sumBy } from 'remeda';

import type { LestaClients } from '../../../core';

import { errorMessage } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { LESTA_CLIENTS } from '../../../core';

@Injectable()
export class ServersOnlineReaderService {
  private readonly logger = new Logger(ServersOnlineReaderService.name);

  constructor(
    private readonly config: AppConfigService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients
  ) {}

  async current(): Promise<ServersOnline> {
    if (this.config.get('LESTA_APPLICATION_ID') === '') {
      return { online: null, servers: [], fetchedAt: null };
    }

    try {
      const servers = (await this.clients.priority.wgn.servers()).map((entry) => ({ server: entry.server, online: entry.players_online }));

      return { online: sumBy(servers, (entry) => entry.online), servers, fetchedAt: new Date().toISOString() };
    } catch (error) {
      this.logger.warn(`servers online unavailable: ${errorMessage(error)}`);

      return { online: null, servers: [], fetchedAt: null };
    }
  }
}
