import type { ModpackManagerRelease, ModpackRelease, ModpackReleaseIndex, ModpackReleasePackage } from '@otmetki/schemas';
import type { z } from 'zod';

import type { modpackCatalogSchema } from './release-build.schemas';

export type ModpackCatalog = z.infer<typeof modpackCatalogSchema>;

export type UnsignedModpackRelease = Omit<ModpackRelease, 'signature'>;

export type ReleasePayloadInput = Pick<ModpackRelease, 'catalog' | 'games' | 'notes' | 'packages' | 'version'>;

type ReleasePackageFile = Omit<ModpackReleasePackage, 'url'>;

export type BuildReleaseInput = Pick<ModpackRelease, 'games' | 'publishedAt' | 'version'> & {
  baseUrl: string;
  catalog: ModpackCatalog;
  catalogSha256: string;
  packages: ReleasePackageFile[];
};

export type MergeReleaseIndexInput = {
  index: ModpackReleaseIndex;
  release?: ModpackRelease;
  manager?: ModpackManagerRelease;
};
