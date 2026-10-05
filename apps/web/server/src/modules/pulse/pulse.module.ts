import { Module } from '@nestjs/common';

import { pulseQueriesProvider } from './providers/pulse-queries.provider';
import { PulseController } from './pulse.controller';
import { PulseReaderService } from './services/pulse-reader.service';

@Module({
  controllers: [PulseController],
  providers: [pulseQueriesProvider, PulseReaderService]
})
export class PulseModule {}
