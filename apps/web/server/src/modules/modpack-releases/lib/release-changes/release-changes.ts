import type { ModpackChangelog, ModpackReleaseChange } from '@otmetki/schemas';

import type { ChangedPackagesInput, ModpackChangelogInput, PackageFile, ReleaseChangesInput } from './release-changes.types';

import { componentNotes } from '../changelog/changelog';
import { newestFirst } from '../release-order/release-order';
import { RELEASE_CHANGES } from './release-changes.constants';

export const packageVersion = (file: string): string | null => RELEASE_CHANGES.packageVersion.exec(file)?.[1] ?? null;

export const changedPackages = <T extends PackageFile>({ packages, previous }: ChangedPackagesInput<T>): T[] => {
  if (!previous) {
    return [...packages];
  }

  const before = new Map(previous.map((item) => [item.id, item.file]));

  return packages.filter((item) => before.get(item.id) !== item.file);
};

export const releaseChanges = ({ packages, previous, entries }: ReleaseChangesInput): ModpackReleaseChange[] =>
  changedPackages({ packages, previous }).map(({ id, file }) => {
    const version = packageVersion(file);

    if (version === null) {
      throw new Error(`Cannot read the version of package ${id} from its file name ${file}`);
    }

    return { id, version, notes: componentNotes({ entries, id, version }) };
  });

export const modpackChangelog = ({ index, limit }: ModpackChangelogInput): ModpackChangelog => {
  const releases = newestFirst(index.releases);

  return {
    releases: releases.slice(0, limit).map((release, position) => ({
      version: release.version,
      publishedAt: release.publishedAt,
      games: release.games,
      notes: release.notes ?? null,
      changes:
        release.changes ??
        changedPackages({ packages: release.packages, previous: releases[position + 1]?.packages ?? null }).map(({ id, file }) => ({
          id,
          version: packageVersion(file),
          notes: null
        }))
    }))
  };
};
