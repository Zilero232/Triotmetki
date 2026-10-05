import type { OfficialRatingStats, PlayerOfficialRatings } from '@otmetki/schemas';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { OFFICIAL_RATINGS } from '@otmetki/schemas';
import { isNonNullish } from 'remeda';

import type { LestaClient } from '../../../lib/lesta';
import type { OfficialPeriodInput } from '../players.types';

import { availablePeriods, errorMessage, OFFICIAL_PERIOD_TO_LESTA, toNumber, toOfficialFields } from '../../../common/lib';
import { LESTA_CLIENT } from '../../../core';
import { OfficialRatingTypesService } from '../../reference';

@Injectable()
export class PlayerOfficialRatingsReaderService {
  private readonly logger = new Logger(PlayerOfficialRatingsReaderService.name);

  constructor(
    private readonly types: OfficialRatingTypesService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient
  ) {}

  async ratings(accountId: bigint): Promise<PlayerOfficialRatings> {
    const periods = availablePeriods({ wanted: OFFICIAL_RATINGS.profilePeriods, lestaTypes: await this.types.lestaTypes() });
    const stats = await Promise.all(periods.map((period) => this.period({ accountId, period })));

    return { accountId: toNumber(accountId), fetchedAt: new Date().toISOString(), periods: stats.filter(isNonNullish) };
  }

  private async period({ accountId, period }: OfficialPeriodInput): Promise<OfficialRatingStats | null> {
    try {
      const accounts = await this.lesta.ratings.accounts({ type: OFFICIAL_PERIOD_TO_LESTA[period], accountIds: [toNumber(accountId)] });
      const account = accounts[String(accountId)];
      const fields = account ? toOfficialFields(account) : {};

      return Object.keys(fields).length > 0 ? { period, fields } : null;
    } catch (error) {
      this.logger.warn(`official ${period} rating of ${accountId} unavailable: ${errorMessage(error)}`);

      return null;
    }
  }
}
