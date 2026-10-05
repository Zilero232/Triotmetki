import type { ModpackReleasesStatus } from '@otmetki/schemas';

import type { ReleaseStatusInput } from './release-status.types';

import { newestFirst } from '../release-order/release-order';

export const releaseStatus = ({ index, sizes }: ReleaseStatusInput): ModpackReleasesStatus => {
  const [release] = newestFirst(index.releases);
  const manager = index.manager;

  return {
    modpack: release && sizes.modpack !== null ? { version: release.version, publishedAt: release.publishedAt, size: sizes.modpack } : null,
    manager: manager && sizes.manager !== null ? { version: manager.version, publishedAt: manager.publishedAt, size: sizes.manager } : null
  };
};
