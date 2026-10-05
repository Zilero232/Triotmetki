import { Module } from '@nestjs/common';

import { telegramBotProvider } from './providers/telegram-bot.provider';
import { telegramI18nProvider } from './providers/telegram-i18n.provider';
import { TelegramCommandRegistry } from './services/telegram-command-registry.service';
import { TelegramSenderService } from './services/telegram-sender.service';

@Module({
  providers: [telegramBotProvider, telegramI18nProvider, TelegramSenderService, TelegramCommandRegistry],
  exports: [telegramBotProvider, telegramI18nProvider, TelegramSenderService, TelegramCommandRegistry]
})
export class TelegramCoreModule {}
