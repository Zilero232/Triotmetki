import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ScrapeModule } from '../../core';
import { EVENTS_QUEUE } from './config/queue.constants';
import { EventsSchedulesService } from './processors/events-schedules.service';
import { EventsProcessor } from './processors/events.processor';
import { DropsAggregateService } from './services/drops-aggregate.service';
import { EventCalendarSyncService } from './services/event-calendar-sync.service';

@Module({
  imports: [ScrapeModule, BullModule.registerQueue({ name: EVENTS_QUEUE.name })],
  providers: [EventCalendarSyncService, DropsAggregateService, EventsProcessor, EventsSchedulesService]
})
export class EventsWorkerModule {}
