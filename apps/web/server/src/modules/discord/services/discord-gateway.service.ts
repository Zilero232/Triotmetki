import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

import { API, Client, GatewayDispatchEvents, GatewayIntentBits } from '@discordjs/core';
import { WebSocketManager } from '@discordjs/ws';
import { Inject, Injectable, Logger } from '@nestjs/common';

import type { RegisterCommandsInput } from '../discord.types';

import { errorMessage } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { DISCORD_TOKENS } from '../config/tokens.constants';
import { commandDefinitions } from '../lib/command-definitions/command-definitions';
import { DiscordCopyService } from './discord-copy.service';
import { DiscordInteractionsService } from './discord-interactions.service';

@Injectable()
export class DiscordGatewayService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DiscordGatewayService.name);
  private gateway: WebSocketManager | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly interactions: DiscordInteractionsService,
    private readonly copy: DiscordCopyService,
    @Inject(DISCORD_TOKENS.api) private readonly api: API | null
  ) {}

  onApplicationBootstrap(): void {
    if (!this.api) {
      this.logger.log('discord bot is disabled: DISCORD_BOT_TOKEN is empty');

      return;
    }

    if (this.config.get('NODE_ENV') === 'test') {
      return;
    }

    this.connect(this.api).catch((error: unknown) => {
      this.logger.error(`discord gateway could not start: ${errorMessage(error)}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.gateway?.destroy();
    this.gateway = null;
  }

  private async connect(api: API): Promise<void> {
    const gateway = new WebSocketManager({ token: this.config.get('DISCORD_BOT_TOKEN'), intents: GatewayIntentBits.Guilds, rest: api.rest });
    const client = new Client({ rest: api.rest, gateway });

    client.on(GatewayDispatchEvents.InteractionCreate, ({ data }) => {
      void this.interactions.handle(data);
    });

    client.once(GatewayDispatchEvents.Ready, ({ data }) => {
      this.logger.log(`discord bot ${data.user.username} is connected`);
      void this.register({ api, applicationId: data.application.id });
    });

    this.gateway = gateway;
    await gateway.connect();
  }

  private async register({ api, applicationId }: RegisterCommandsInput): Promise<void> {
    try {
      await api.applicationCommands.bulkOverwriteGlobalCommands(applicationId, commandDefinitions({ describe: (key) => this.copy.describe(key) }));
    } catch (error) {
      this.logger.warn(`discord commands not registered: ${errorMessage(error)}`);
    }
  }
}
