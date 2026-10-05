import type { ModpackRelease, ModpackReleaseIndex } from '@otmetki/schemas';

import { sortBy } from 'remeda';

import type { BuildReleaseInput, MergeReleaseIndexInput, ModpackCatalog, ReleasePayloadInput, UnsignedModpackRelease } from './release-build.types';

import { newestFirst } from '../release-order/release-order';
import { RELEASE_BUILD } from './release-build.constants';

const hex = (digest: string) => digest.trim().toLowerCase();

export const catalogPackages = (catalog: ModpackCatalog): ModpackCatalog['components'] =>
  catalog.components.filter((component) => component.kind !== RELEASE_BUILD.dependencyKind);

export const releasePayload = ({ version, games, catalog, packages }: ReleasePayloadInput): string => {
  const lines = [
    RELEASE_BUILD.payloadHeader,
    `version ${version}`,
    `games ${games.join(',')}`,
    `catalog ${catalog ? hex(catalog.sha256) : RELEASE_BUILD.noCatalog}`,
    ...sortBy(packages, (item) => item.id).map((item) => `package ${item.id} ${item.file} ${item.size} ${hex(item.sha256)}`)
  ];

  return `${lines.join('\n')}\n`;
};

export const buildRelease = ({
  version,
  games,
  publishedAt,
  baseUrl,
  catalog,
  catalogSha256,
  packages
}: BuildReleaseInput): UnsignedModpackRelease => {
  if (catalog.modpackVersion !== version) {
    throw new Error(`The component catalogue is for modpack ${catalog.modpackVersion}, not ${version}`);
  }

  return {
    version,
    publishedAt,
    games,
    notes: null,
    catalog: { url: `${baseUrl}/${RELEASE_BUILD.catalogPath}`, sha256: hex(catalogSha256) },
    packages: packages.map((item) => ({ ...item, sha256: hex(item.sha256), url: `${baseUrl}/${item.file}` }))
  };
};

const withRelease = (releases: ModpackReleaseIndex['releases'], release: ModpackRelease): ModpackReleaseIndex['releases'] => {
  const previous = releases.find((candidate) => candidate.version === release.version);
  const others = releases.filter((candidate) => candidate.version !== release.version);

  return newestFirst([...others, { ...release, publishedAt: previous?.publishedAt ?? release.publishedAt }]);
};

export const mergeReleaseIndex = ({ index, release, manager }: MergeReleaseIndexInput): ModpackReleaseIndex => {
  if (!release && !manager) {
    throw new Error('Nothing to merge: pass a modpack release, a manager release or both');
  }

  return {
    schemaVersion: index.schemaVersion,
    releases: release ? withRelease(index.releases, release) : index.releases,
    manager: manager
      ? { ...manager, publishedAt: index.manager?.version === manager.version ? index.manager.publishedAt : manager.publishedAt }
      : index.manager
  };
};
