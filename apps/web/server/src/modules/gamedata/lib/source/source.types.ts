import type { Options } from 'ky';

import type { GAME_DATA_SOURCES } from './source.constants';

type GameDataSourceId = keyof typeof GAME_DATA_SOURCES;

type RepoSource = {
  owner: string;
  repo: string;
  ref: string;
};

type RepoRevision = RepoSource & {
  sha: string;
  committedAt?: string;
};

export type SourceRevision = RepoRevision & {
  sourceId: GameDataSourceId;
};

export type RepoReader = {
  revision: RepoRevision;
  read: (path: string) => Promise<string | undefined>;
};

export type SourceReader = RepoReader & {
  revision: SourceRevision;
};

export type FetchLike = NonNullable<Options['fetch']>;

export type CreateRepoReaderInput = {
  source: RepoSource;
  ref?: string;
  cacheDir: string;
  token?: string;
  concurrency?: number;
  retryDelayMs?: number;
  fetch?: FetchLike;
};

export type CreateGithubReaderInput = Omit<CreateRepoReaderInput, 'source'> & {
  sourceId: GameDataSourceId;
};

export type CreateLocalRepoReaderInput = {
  source: RepoSource;
  root: string;
  sha?: string;
};

export type CreateLocalReaderInput = {
  sourceId: GameDataSourceId;
  root: string;
  sha?: string;
};

export type ResolveCommitInput = {
  source: RepoSource;
  ref: string;
  token?: string;
  fetch?: FetchLike;
};

export type RawUrlInput = {
  owner: string;
  repo: string;
  sha: string;
  path: string;
};

export type MinimapUrlInput = {
  sourceId: GameDataSourceId;
  path: string;
};

export type AssetUrlInput = MinimapUrlInput;

export type ResolvedCommit = {
  sha: string;
  committedAt?: string;
};

export type CreateMemoryReaderInput = {
  sourceId: GameDataSourceId;
  files: Record<string, string>;
};
