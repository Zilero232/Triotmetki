'use client';

import type { BuildCohort, BuildMode } from '@otmetki/schemas';

import { BUILD_USAGE } from '@otmetki/schemas';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { isIncludedIn } from 'remeda';

import { getRecommendedBuild, recommendedBuildHref } from '@/entities/tank/build';
import { usePlus } from '@/features/plus/plus-gate';
import { QUERY_KEYS } from '@/shared/constants';

import { HOW_TO_BUILD } from '../../../config';
import { orderCrew } from '../../../lib';
import { useTank } from '../../context';

export const useHowToBuild = () => {
  const { tankId, slug } = useTank();
  const { isPlus, isPending: isPlusPending } = usePlus();
  const [mode, setMode] = useState<BuildMode>(BUILD_USAGE.defaultMode);
  const [cohort, setCohort] = useState<BuildCohort>(BUILD_USAGE.defaultCohort);

  const isPlusCohort = isIncludedIn(cohort, BUILD_USAGE.plusCohorts);
  const isLocked = isPlusCohort && !isPlus && !isPlusPending;
  const params = { tankId, mode, cohort };

  const query = useQuery({
    queryKey: QUERY_KEYS.builds.recommended(params),
    queryFn: ({ signal }) => getRecommendedBuild({ ...params, signal }),
    enabled: !isPlusCohort || isPlus,
    placeholderData: keepPreviousData
  });

  const { data: recommended } = query;
  const usage = recommended?.usage;

  return {
    mode,
    cohort,
    setMode,
    setCohort,
    modes: BUILD_USAGE.modes,
    cohorts: BUILD_USAGE.cohorts,
    isPlusCohort: (value: BuildCohort) => isIncludedIn(value, BUILD_USAGE.plusCohorts),
    isLocked,
    usage,
    crew: usage ? orderCrew({ crew: usage.crew, skillsPerRole: HOW_TO_BUILD.skillsPerRole }) : [],
    hasLoadout: Boolean(recommended?.loadout),
    href: recommendedBuildHref({ slug, mode, cohort }),
    query
  };
};
