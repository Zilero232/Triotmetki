import type { ComparedProfile, PickProfileInput } from './compare-profile.types';

import { COMPARE_PROFILE } from '../../config/compare.constants';

export const pickProfile = <T extends ComparedProfile>({ profiles, tankId, wanted }: PickProfileInput<T>): T | undefined => {
  const own = profiles.filter((profile) => profile.tankId === tankId);

  return (
    own.find((candidate) => candidate.profileId === (wanted ?? COMPARE_PROFILE.preferred)) ?? own.find((candidate) => candidate.isDefault) ?? own[0]
  );
};
