import type { BuildAdvice } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { BUILD_USAGE } from '@otmetki/schemas';

import { toBuildAdvice } from '../mappers/build-advice.mappers';
import { BuildUsageReaderService } from './build-usage-reader.service';

@Injectable()
export class BuildAdviceReaderService {
  constructor(private readonly usage: BuildUsageReaderService) {}

  async advice(tankId: number): Promise<BuildAdvice> {
    const usage = await this.usage.usage({ tankId, mode: BUILD_USAGE.defaultMode, cohort: BUILD_USAGE.defaultCohort });

    return toBuildAdvice({ tankId, usage });
  }
}
