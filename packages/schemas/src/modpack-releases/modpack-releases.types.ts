import type { z } from 'zod';

import type {
  modpackChangelogSchema,
  modpackLatestReleaseSchema,
  modpackManagerReleaseSchema,
  modpackManagerUpdateQuerySchema,
  modpackManagerUpdateSchema,
  modpackReleaseChangeSchema,
  modpackReleaseIndexSchema,
  modpackReleasePackageSchema,
  modpackReleaseSchema,
  modpackReleasesStatusSchema
} from './modpack-releases.schemas';

export type ModpackReleasePackage = z.infer<typeof modpackReleasePackageSchema>;
export type ModpackRelease = z.infer<typeof modpackReleaseSchema>;
export type ModpackManagerRelease = z.infer<typeof modpackManagerReleaseSchema>;
export type ModpackReleaseIndex = z.infer<typeof modpackReleaseIndexSchema>;
export type ModpackLatestRelease = z.infer<typeof modpackLatestReleaseSchema>;
export type ModpackManagerUpdateQuery = z.infer<typeof modpackManagerUpdateQuerySchema>;
export type ModpackManagerUpdate = z.infer<typeof modpackManagerUpdateSchema>;
export type ModpackReleasesStatus = z.infer<typeof modpackReleasesStatusSchema>;
export type ModpackReleaseChange = z.infer<typeof modpackReleaseChangeSchema>;
export type ModpackChangelog = z.infer<typeof modpackChangelogSchema>;
