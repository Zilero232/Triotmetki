'use client';

import { useQuery } from '@tanstack/react-query';

import type { ModpackAvailability } from './use-modpack-availability.types';

import { modpackReleaseQueries } from '../../../api';

export const useModpackAvailability = (): ModpackAvailability => {
  const { data, isPending, isError } = useQuery(modpackReleaseQueries.status());
  const modpack = data?.modpack ?? null;
  const manager = data?.manager ?? null;

  return { isPending, isError, isPublished: modpack !== null || manager !== null, modpack, manager };
};
