import { Module } from '@nestjs/common';

import { BotCommandsModule } from '../bot-commands';
import { vkBotProvider } from './providers/vk-bot.provider';
import { VkBotService } from './services/vk-bot.service';
import { VkStatusReaderService } from './services/vk-status-reader.service';
import { VkController } from './vk.controller';

@Module({
  imports: [BotCommandsModule],
  controllers: [VkController],
  providers: [vkBotProvider, VkBotService, VkStatusReaderService]
})
export class VkModule {}
