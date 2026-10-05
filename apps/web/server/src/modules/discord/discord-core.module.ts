import { Module } from '@nestjs/common';

import { DISCORD_TOKENS } from './config/tokens.constants';
import { discordApiProvider } from './providers/discord-api.provider';
import { DiscordSenderService } from './services/discord-sender.service';

@Module({
  providers: [discordApiProvider, DiscordSenderService],
  exports: [DISCORD_TOKENS.api, DiscordSenderService]
})
export class DiscordCoreModule {}
