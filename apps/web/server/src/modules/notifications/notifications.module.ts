import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from './notifications-producer.module';
import { NotificationsController } from './notifications.controller';
import { InboxReaderService } from './services/inbox-reader.service';
import { PushSubscriptionsWriterService } from './services/push-subscriptions-writer.service';

@Module({
  imports: [NotificationsProducerModule],
  controllers: [NotificationsController],
  providers: [InboxReaderService, PushSubscriptionsWriterService],
  exports: [NotificationsProducerModule]
})
export class NotificationsModule {}
