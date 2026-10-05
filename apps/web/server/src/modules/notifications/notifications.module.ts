import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from './notifications-producer.module';
import { NotificationsController } from './notifications.controller';
import { InboxService } from './services/inbox.service';
import { PushSubscriptionsService } from './services/push-subscriptions.service';

@Module({
  imports: [NotificationsProducerModule],
  controllers: [NotificationsController],
  providers: [InboxService, PushSubscriptionsService],
  exports: [NotificationsProducerModule]
})
export class NotificationsModule {}
