import { Injectable } from '@nestjs/common';
import { parseXvmExpectedValues } from '@otmetki/ratings';

import { isoDay } from '../../../../common/lib';
import { SOURCES } from '../../../../config';
import { HttpClientService, PrismaService } from '../../../../core';
import { expectedValuesDate } from '../lib/community-data/community-data';
import { toExpectedValueRecord } from '../mappers/expected-value.mappers';

@Injectable()
export class ExpectedValuesSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpClientService
  ) {}

  async sync() {
    const { header, table } = parseXvmExpectedValues(await this.http.getText({ url: SOURCES.wn8Expected }));
    const date = expectedValuesDate({ header, now: new Date() });

    const rows = [...table.values()].map((values) => toExpectedValueRecord({ values, date }));

    const { count } = await this.prisma.wn8ExpectedValue.createMany({ data: rows, skipDuplicates: true });

    return { date: isoDay(date), vehicles: rows.length, inserted: count };
  }
}
