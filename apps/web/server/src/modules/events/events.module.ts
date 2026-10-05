import { Module } from '@nestjs/common';

import { EventsController } from './events.controller';
import { EventReaderService } from './services/event-reader.service';

@Module({
  controllers: [EventsController],
  providers: [EventReaderService]
})
export class EventsModule {}
