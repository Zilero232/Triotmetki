import type { ModpackReleaseIndex, ModpackReleasePackage } from '@otmetki/schemas';

import type { ChangelogEntries } from '../changelog/changelog.types';

export type PackageFile = Pick<ModpackReleasePackage, 'file' | 'id'>;

export type ChangedPackagesInput<T extends PackageFile> = {
  packages: readonly T[];
  previous: readonly PackageFile[] | null;
};

export type ReleaseChangesInput = ChangedPackagesInput<PackageFile> & {
  entries: ChangelogEntries;
};

export type ModpackChangelogInput = {
  index: ModpackReleaseIndex;
  limit: number;
};
