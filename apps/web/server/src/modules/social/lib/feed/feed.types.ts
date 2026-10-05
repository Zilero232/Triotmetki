import type { AccountBadge } from '../../../../../generated';
import type { RecordEventRow, TankEventRow } from '../../queries/snapshot-events.types';
import type { FeedItem } from '../../social.types';

export type BuildFeedInput = {
  snapshots: readonly TankEventRow[];
  records: readonly RecordEventRow[];
  badges: readonly FeedBadge[];
  nicknames: ReadonlyMap<bigint, string>;
  aceMastery: number;
  limit: number;
  badgeOf: (code: string) => FeedItem['badge'];
};

export type { FeedItem };

type FeedBadge = Pick<AccountBadge, 'accountId' | 'awardedAt' | 'badgeCode'>;

export type MarkRow = Pick<TankEventRow, 'marksOnGun' | 'prevMarks'>;

export type MasteryGainInput = {
  row: Pick<TankEventRow, 'markOfMastery' | 'prevMastery'>;
  aceMastery: number;
};
