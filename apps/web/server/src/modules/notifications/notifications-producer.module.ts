import { Module } from '@nestjs/common';

import { notificationQueues } from './providers/notification-queues.provider';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [notificationQueues],
  providers: [NotificationService],
  exports: [notificationQueues, NotificationService]
})
export class NotificationsProducerModule {}
