import { Injectable } from '@nestjs/common';

import type { ModMoeThresholds } from '../marks.types';

import { ThresholdsService } from '../../reference';
import { toModMoeThresholds } from '../mappers/mod-thresholds.mappers';
import { MoeCurveReaderService } from './moe-curve-reader.service';

@Injectable()
export class ModThresholdsReaderService {
  constructor(
    private readonly thresholds: ThresholdsService,
    private readonly curves: MoeCurveReaderService
  ) {}

  async forTank(tankId: number): Promise<ModMoeThresholds> {
    const [moe, mastery, curve] = await Promise.all([this.thresholds.moe(tankId), this.thresholds.mastery(tankId), this.curves.curve(tankId)]);

    return toModMoeThresholds({ tankId, moe, mastery, curve: curve.points });
  }
}
