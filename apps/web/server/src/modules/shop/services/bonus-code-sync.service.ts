import { Injectable } from '@nestjs/common';

import type { ScrapeSummary } from '../shop.types';

import { SOURCES } from '../../../config';
import { PageCrawlerService } from '../../../core';
import { BONUS_CODE } from '../config/bonus-codes.constants';
import { parseWotexpressCodes } from '../lib/wotexpress-codes/wotexpress-codes';
import { BonusCodeWriterService } from './bonus-code-writer.service';

@Injectable()
export class BonusCodeSyncService {
  constructor(
    private readonly bonusCodes: BonusCodeWriterService,
    private readonly crawler: PageCrawlerService
  ) {}

  async run(now: Date): Promise<ScrapeSummary> {
    const [page] = await this.crawler.crawl({ urls: [SOURCES.wotexpressBonusCodes] });
    const scraped = page ? parseWotexpressCodes({ $: page.$, baseUrl: SOURCES.wotexpressBonusCodes, reference: now }) : [];
    let created = 0;

    for (const { code, title, sourceUrl } of scraped) {
      if (await this.bonusCodes.discover({ code, title, source: BONUS_CODE.wotexpressSource, sourceUrl, expiresAt: null })) {
        created += 1;
      }
    }

    return { seen: scraped.length, created, notified: created };
  }
}
