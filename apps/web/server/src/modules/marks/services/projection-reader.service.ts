import { Injectable } from '@nestjs/common';

import type { MoeProjectionInput, MoeProjectionResult } from '../marks.types';

import { ThresholdsService } from '../../reference';
import { projectMarks } from '../lib/projection/projection';

@Injectable()
export class ProjectionReaderService {
  constructor(private readonly thresholds: ThresholdsService) {}

  async project(input: MoeProjectionInput): Promise<MoeProjectionResult> {
    const moe = await this.thresholds.moe(input.tankId);

    return {
      ...input,
      battlesNeeded: moe
        ? projectMarks({
            thresholds: { p65: moe.p65, p85: moe.p85, p95: moe.p95, p100: moe.p100 },
            currentPercent: input.currentPercent,
            targetMarks: input.targetMarks,
            avgDamage: input.avgDamage
          })
        : null
    };
  }
}
