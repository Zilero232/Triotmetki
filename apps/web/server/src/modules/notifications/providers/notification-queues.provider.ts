import { BullModule } from '@nestjs/bullmq';

import { NOTIFICATIONS_QUEUE } from '../config/notifications-queue.constants';

export const notificationQueues = BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE.deliver }, { name: NOTIFICATIONS_QUEUE.events });
