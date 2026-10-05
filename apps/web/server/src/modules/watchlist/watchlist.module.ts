import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { BotCommandsModule } from '../bot-commands';
import { TelegramCoreModule } from '../telegram';
import { watchlistQueriesProvider } from './providers/watchlist-queries.provider';
import { WatchlistActivityReaderService, WatchlistBotService, WatchlistService } from './services';
import { WatchlistController } from './watchlist.controller';

@Module({
  imports: [BillingCoreModule, BotCommandsModule, TelegramCoreModule],
  controllers: [WatchlistController],
  providers: [watchlistQueriesProvider, WatchlistActivityReaderService, WatchlistService, WatchlistBotService]
})
export class WatchlistModule {}
