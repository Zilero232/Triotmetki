import { Module } from '@nestjs/common';

import { DiscordCoreModule } from '../discord';
import { NotificationLedgerService } from '../notifications';
import { TelegramCoreModule } from '../telegram';
import { SessionShareProcessor } from './processors/session-share.processor';
import { SessionShareDeliveryService } from './services/session-share-delivery.service';
import { SessionShareProducerModule } from './session-share-producer.module';

@Module({
  imports: [SessionShareProducerModule, TelegramCoreModule, DiscordCoreModule],
  providers: [NotificationLedgerService, SessionShareDeliveryService, SessionShareProcessor]
})
export class SessionShareWorkerModule {}
