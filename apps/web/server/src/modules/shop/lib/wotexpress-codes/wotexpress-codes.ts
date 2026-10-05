import type { ParseWotexpressInput, ScrapedBonusCode } from './wotexpress-codes.types';

import { absoluteUrl, parseRussianDay } from '../../../../lib/scrape';
import { BONUS_CODE } from '../../config/bonus-codes.constants';

export const codesInTitle = (title: string): string[] =>
  [...title.matchAll(BONUS_CODE.titlePattern)].flatMap((found) =>
    (found[1] ?? '')
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter((token) => BONUS_CODE.titleTokenPattern.test(token))
  );

export const parseWotexpressCodes = ({ $, baseUrl, reference }: ParseWotexpressInput): ScrapedBonusCode[] =>
  $('article.news-rows_item')
    .toArray()
    .flatMap((element) => {
      const item = $(element);
      const title = item.find('.news-info_name').first().text().replaceAll(/\s+/g, ' ').trim();
      const href = item.find('a').first().attr('href');
      const sourceUrl = href ? absoluteUrl({ href, baseUrl }) : null;

      if (!title || !sourceUrl) {
        return [];
      }

      const publishedAt = parseRussianDay({ text: item.find('.news-likedata_text').first().text(), reference });

      return codesInTitle(title).map((code) => ({ code, title, sourceUrl, publishedAt }));
    });
