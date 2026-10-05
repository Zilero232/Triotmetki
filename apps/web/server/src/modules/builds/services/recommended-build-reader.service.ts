import type { LoadoutResult, RecommendedBuild } from '@otmetki/schemas';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BUILD_USAGE, loadoutRequestSchema } from '@otmetki/schemas';

import type { CalculateRecommendedInput, EnsureCohortInput, RecommendedBuildInput } from '../builds.types';

import { AppForbiddenException } from '../../../common/exceptions';
import { EntitlementsService } from '../../billing';
import { RECOMMENDED_BUILD } from '../config/recommended.constants';
import { recommendLoadout } from '../lib/recommend-loadout/recommend-loadout';
import { BuildUsageReaderService } from './build-usage-reader.service';
import { LoadoutReaderService } from './loadout-reader.service';

@Injectable()
export class RecommendedBuildReaderService {
  constructor(
    private readonly usage: BuildUsageReaderService,
    private readonly loadouts: LoadoutReaderService,
    private readonly entitlements: EntitlementsService
  ) {}

  async recommended({ tankId, query, viewerUserId }: RecommendedBuildInput): Promise<RecommendedBuild> {
    await this.ensureCohort({ cohort: query.cohort, viewerUserId });

    const usage = await this.usage.usage({ tankId, mode: query.mode, cohort: query.cohort });
    const loadout = recommendLoadout(usage);
    const result = loadout ? await this.calculate({ tankId, loadout }) : null;

    return { tankId, usage, loadout, result };
  }

  async ensureCohort({ cohort, viewerUserId }: EnsureCohortInput): Promise<void> {
    const plusCohorts: readonly string[] = BUILD_USAGE.plusCohorts;

    if (!plusCohorts.includes(cohort)) {
      return;
    }

    if (!viewerUserId) {
      throw new AppForbiddenException('SUBSCRIPTION_REQUIRED', `The ${cohort} cohort needs Plus`, { feature: RECOMMENDED_BUILD.plusFeature });
    }

    await this.entitlements.assertFeature({ userId: viewerUserId, feature: RECOMMENDED_BUILD.plusFeature });
  }

  private async calculate({ tankId, loadout }: CalculateRecommendedInput): Promise<LoadoutResult | null> {
    try {
      return await this.loadouts.calculate({ tankId, request: loadoutRequestSchema.parse({ loadout }) });
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.BAD_REQUEST) {
        return null;
      }

      throw error;
    }
  }
}
