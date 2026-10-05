import { Module } from '@nestjs/common';

import { AnalyticsCoreModule } from '../analytics';
import { HonestRngController } from './honest-rng.controller';
import { HonestRngReaderService } from './services/honest-rng-reader.service';

@Module({
  imports: [AnalyticsCoreModule],
  controllers: [HonestRngController],
  providers: [HonestRngReaderService]
})
export class HonestRngModule {}
