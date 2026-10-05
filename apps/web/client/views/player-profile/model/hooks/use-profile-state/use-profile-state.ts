'use client';

import type { PlayerProfile, RatingPeriod } from '@otmetki/schemas';

import { useState } from 'react';

import type { ProfileContextValue } from '../../context';

import { PROFILE_VIEW } from '../../../config';

export const useProfileState = (profile: PlayerProfile): ProfileContextValue => {
  const [period, setPeriod] = useState<RatingPeriod>(PROFILE_VIEW.defaultPeriod);

  const { accountId, nickname } = profile.summary;

  return { profile, accountId, nickname, period, setPeriod };
};
