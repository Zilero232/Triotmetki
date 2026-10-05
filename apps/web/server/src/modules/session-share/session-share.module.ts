import { Module } from '@nestjs/common';

import { ModModule } from '../mod';
import { SessionShareWriterService } from './services/session-share-writer.service';
import { SessionShareProducerModule } from './session-share-producer.module';
import { SessionShareController } from './session-share.controller';

@Module({
  imports: [ModModule, SessionShareProducerModule],
  controllers: [SessionShareController],
  providers: [SessionShareWriterService]
})
export class SessionShareModule {}
