export type DevReplaysPage = { items: unknown[] } & Record<string, unknown>;

export type DevGamefaceInput = { replaysPage: DevReplaysPage };

export type ReplaysSnapshotInput = { replaysPage: DevReplaysPage; rev: number };
