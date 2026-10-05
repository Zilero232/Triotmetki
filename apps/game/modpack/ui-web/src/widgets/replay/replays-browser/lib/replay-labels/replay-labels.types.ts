import type { ReplayItem, ReplaysPage } from '@/entities/replay/replay';

import type { ReplaysText } from '../replays-text';

export type JoinedInput = { parts: (string | null | undefined)[]; separator: string };

export type RowMetaInput = { item: ReplayItem; typeLabel: string };

export type UploadHintInput = { item: ReplayItem; upload: ReplaysPage['upload'] };

export type DetailStatsInput = { item: ReplayItem; t: ReplaysText };

export type DetailStat = { key: string; label: string; value: string; accent?: boolean; wide?: boolean };
