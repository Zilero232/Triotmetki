import { load } from 'cheerio';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { PageCrawlerService } from '../../../../core';
import type { BonusCodeWriterService } from '../bonus-code-writer.service';

import { SOURCES } from '../../../../config';
import { BONUS_CODE } from '../../config/bonus-codes.constants';
import { parseWotexpressCodes } from '../../lib/wotexpress-codes/wotexpress-codes';
import { BonusCodeSyncService } from '../bonus-code-sync.service';

const $ = load(readFileSync(new URL('../../lib/wotexpress-codes/_tests/fixtures/wotexpress-bonus-codes.html', import.meta.url), 'utf8'));
const now = new Date('2026-09-25T00:00:00Z');
const scraped = parseWotexpressCodes({ $, baseUrl: SOURCES.wotexpressBonusCodes, reference: now });

describe('BonusCodeSyncService.run', () => {
  it('offers every code of the page and counts only the new ones', async () => {
    const bonusCodes = mock<BonusCodeWriterService>();
    const crawler = mock<PageCrawlerService>();

    crawler.crawl.mockResolvedValue([{ url: SOURCES.wotexpressBonusCodes, $ }]);
    bonusCodes.discover.mockResolvedValueOnce(false).mockResolvedValue(true);

    const summary = await new BonusCodeSyncService(bonusCodes, crawler).run(now);

    expect(scraped.length).toBeGreaterThan(1);
    expect(bonusCodes.discover.mock.calls.map(([input]) => input.code)).toEqual(scraped.map((item) => item.code));
    expect(bonusCodes.discover).toHaveBeenCalledWith(expect.objectContaining({ source: BONUS_CODE.wotexpressSource, expiresAt: null }));
    expect(summary).toEqual({ seen: scraped.length, created: scraped.length - 1, notified: scraped.length - 1 });
  });

  it('does nothing when the page could not be fetched', async () => {
    const bonusCodes = mock<BonusCodeWriterService>();
    const crawler = mock<PageCrawlerService>();

    crawler.crawl.mockResolvedValue([]);

    expect(await new BonusCodeSyncService(bonusCodes, crawler).run(now)).toEqual({ seen: 0, created: 0, notified: 0 });
    expect(bonusCodes.discover).not.toHaveBeenCalled();
  });
});
