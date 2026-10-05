import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { BotCommandsModule } from '../bot-commands';
import { TelegramCoreModule } from '../telegram';
import { watchlistQueriesProvider } from './providers/watchlist-queries.provider';
import { WatchlistActivityReaderService } from './services/watchlist-activity-reader.service';
import { WatchlistBotService } from './services/watchlist-bot.service';
import { WatchlistWriterService } from './services/watchlist-writer.service';
import { WatchlistController } from './watchlist.controller';

@Module({
  imports: [BillingCoreModule, BotCommandsModule, TelegramCoreModule],
  controllers: [WatchlistController],
  providers: [watchlistQueriesProvider, WatchlistActivityReaderService, WatchlistWriterService, WatchlistBotService]
})
export class WatchlistModule {}
