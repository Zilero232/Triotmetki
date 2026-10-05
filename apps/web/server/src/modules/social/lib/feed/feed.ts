import { sortBy } from 'remeda';

import type { BuildFeedInput, FeedItem, MarkRow, MasteryGainInput } from './feed.types';

export const isMarkGain = (row: MarkRow): boolean => row.marksOnGun !== null && row.prevMarks !== null && row.marksOnGun > row.prevMarks;

export const isMasteryGain = ({ row, aceMastery }: MasteryGainInput): boolean =>
  row.prevMastery !== null && row.markOfMastery === aceMastery && row.prevMastery < aceMastery;

export const buildFeed = ({ snapshots, records, badges, nicknames, aceMastery, limit, badgeOf }: BuildFeedInput): FeedItem[] => {
  const items: FeedItem[] = [];
  const base = (accountId: bigint | number) => ({ accountId: Number(accountId), nickname: nicknames.get(BigInt(accountId)) ?? null, badge: null });

  for (const row of snapshots) {
    if (isMarkGain(row)) {
      items.push({
        ...base(row.accountId),
        kind: 'mark',
        tankId: row.tankId,
        value: row.marksOnGun ?? 0,
        previous: row.prevMarks,
        at: row.capturedAt.toISOString()
      });
    }

    if (isMasteryGain({ row, aceMastery })) {
      items.push({
        ...base(row.accountId),
        kind: 'mastery',
        tankId: row.tankId,
        value: row.markOfMastery,
        previous: row.prevMastery,
        at: row.capturedAt.toISOString()
      });
    }
  }

  for (const row of records) {
    if (row.maxDamage !== null && row.prevMaxDamage !== null && row.maxDamage > row.prevMaxDamage) {
      items.push({
        ...base(row.accountId),
        kind: 'record',
        tankId: row.maxDamageTankId,
        value: row.maxDamage,
        previous: row.prevMaxDamage,
        at: row.capturedAt.toISOString()
      });
    }
  }

  for (const badge of badges) {
    items.push({
      ...base(badge.accountId),
      kind: 'badge',
      tankId: null,
      value: 1,
      previous: null,
      badge: badgeOf(badge.badgeCode),
      at: badge.awardedAt.toISOString()
    });
  }

  return sortBy(items, [(item) => item.at, 'desc']).slice(0, limit);
};
