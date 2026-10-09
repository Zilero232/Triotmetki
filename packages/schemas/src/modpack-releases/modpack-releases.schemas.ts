import * as z from 'zod';

import { MODPACK_RELEASE_STATUSES, MODPACK_RELEASES } from './modpack-releases.constants';

const httpsUrlSchema = z.url({ protocol: /^https$/ });

const sha256Schema = z.string().regex(MODPACK_RELEASES.sha256Pattern);

const semverSchema = z.string().regex(MODPACK_RELEASES.semverPattern);

const modpackGameVersionSchema = z.string().trim().regex(MODPACK_RELEASES.gameVersionPattern);

export const modpackLocalizedSchema = z.object({ ru: z.string(), en: z.string() });

export const modpackReleasePackageSchema = z.object({
  id: z.string().regex(MODPACK_RELEASES.componentIdPattern),
  file: z.string().regex(MODPACK_RELEASES.packageFilePattern),
  url: httpsUrlSchema,
  sha256: sha256Schema,
  size: z.number().int().nonnegative()
});

export const modpackReleaseChangeSchema = z.object({
  id: z.string().regex(MODPACK_RELEASES.componentIdPattern),
  version: semverSchema,
  notes: modpackLocalizedSchema.nullable()
});

export const modpackReleaseSchema = z.object({
  version: semverSchema,
  publishedAt: z.iso.datetime(),
  games: z.array(z.string().regex(MODPACK_RELEASES.gamePattern)).min(1),
  notes: modpackLocalizedSchema.nullish(),
  changes: z.array(modpackReleaseChangeSchema).nullish(),
  catalog: z.object({ url: httpsUrlSchema, sha256: sha256Schema }).nullish(),
  packages: z.array(modpackReleasePackageSchema).min(1),
  signature: z.string().min(1)
});

export const modpackManagerReleaseSchema = z.object({
  version: semverSchema,
  publishedAt: z.iso.datetime(),
  notes: z.string().default(''),
  platforms: z.record(z.string(), z.object({ url: httpsUrlSchema, signature: z.string().min(1) }))
});

export const modpackReleaseIndexSchema = z.object({
  schemaVersion: z.literal(MODPACK_RELEASES.indexSchemaVersion),
  releases: z.array(modpackReleaseSchema),
  manager: modpackManagerReleaseSchema.nullish()
});

export const modpackLatestQuerySchema = z.object({
  game: modpackGameVersionSchema
});

const modpackReleaseStatusSchema = z.enum(MODPACK_RELEASE_STATUSES);

export const modpackLatestReleaseSchema = z.object({
  game: z.string(),
  status: modpackReleaseStatusSchema,
  release: modpackReleaseSchema.nullable()
});

export const modpackManagerUpdateQuerySchema = z.object({
  target: z.string().min(1),
  arch: z.string().min(1),
  current: semverSchema
});

export const modpackManagerUpdateSchema = z.object({
  version: semverSchema,
  notes: z.string(),
  pub_date: z.string(),
  url: httpsUrlSchema,
  signature: z.string()
});

const modpackDownloadSchema = z.object({
  version: semverSchema,
  publishedAt: z.iso.datetime(),
  size: z.number().int().nonnegative()
});

export const modpackReleasesStatusSchema = z.object({
  modpack: modpackDownloadSchema.nullable(),
  manager: modpackDownloadSchema.nullable()
});

export const modpackChangelogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MODPACK_RELEASES.changelogMaxLimit).default(MODPACK_RELEASES.changelogDefaultLimit)
});

const modpackChangelogChangeSchema = z.object({
  id: z.string(),
  version: z.string().nullable(),
  notes: modpackLocalizedSchema.nullable()
});

const modpackChangelogReleaseSchema = z.object({
  version: semverSchema,
  publishedAt: z.iso.datetime(),
  games: z.array(z.string()),
  notes: modpackLocalizedSchema.nullable(),
  changes: z.array(modpackChangelogChangeSchema)
});

export const modpackChangelogSchema = z.object({
  releases: z.array(modpackChangelogReleaseSchema)
});
