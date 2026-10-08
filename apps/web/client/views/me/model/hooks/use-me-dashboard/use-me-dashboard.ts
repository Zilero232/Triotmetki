'use client';

import { useLinkedAccounts } from '@/entities/auth/session';
import { ROUTES } from '@/shared/constants';

import { ownProfileNickname } from '../../../lib/own-profile';

export const useMeDashboard = () => {
  const { data: accounts } = useLinkedAccounts();

  const nickname = ownProfileNickname(accounts);

  return { profileHref: nickname ? ROUTES.players.profile(nickname) : null };
};
