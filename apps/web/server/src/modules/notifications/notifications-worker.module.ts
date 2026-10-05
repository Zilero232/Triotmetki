import { Module } from '@nestjs/common';

import { UserLestaAccountsModule } from '../../core';
import { AnalyticsCoreModule } from '../analytics';
import { HostLookupService } from '../developer';
import { ReferenceCoreModule } from '../reference';
import { TelegramCoreModule } from '../telegram';
import { NotificationsProducerModule } from './notifications-producer.module';
import { DeliverProcessor } from './processors/deliver.processor';
import { NotificationEventsProcessor } from './processors/notification-events.processor';
import { NotificationSchedulesService } from './processors/notification-schedules.service';
import { marksWatchQueriesProvider } from './providers/marks-watch-queries.provider';
import { plusCheckoutProvider } from './providers/plus-checkout.provider';
import { DeliveryService } from './services/delivery.service';
import { EmailService } from './services/email.service';
import { FirstWinRemindersService } from './services/first-win-reminders.service';
import { MailTransportService } from './services/mail-transport.service';
import { MarksWatchService } from './services/marks-watch.service';
import { NotificationLedgerService } from './services/notification-ledger.service';
import { PlusLaunchService } from './services/plus-launch.service';
import { SessionReportsService } from './services/session-reports.service';
import { ThresholdDropsService } from './services/threshold-drops.service';
import { WebPushSenderService } from './services/web-push-sender.service';
import { WebPushService } from './services/web-push.service';
import { WeeklyDigestService } from './services/weekly-digest.service';

@Module({
  imports: [NotificationsProducerModule, TelegramCoreModule, ReferenceCoreModule, AnalyticsCoreModule, UserLestaAccountsModule],
  providers: [
    DeliveryService,
    EmailService,
    FirstWinRemindersService,
    WebPushService,
    WebPushSenderService,
    MailTransportService,
    HostLookupService,
    MarksWatchService,
    NotificationLedgerService,
    SessionReportsService,
    ThresholdDropsService,
    WeeklyDigestService,
    PlusLaunchService,
    plusCheckoutProvider,
    marksWatchQueriesProvider,
    DeliverProcessor,
    NotificationEventsProcessor,
    NotificationSchedulesService
  ],
  exports: [NotificationsProducerModule]
})
export class NotificationsWorkerModule {}
