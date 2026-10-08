'use client';

import { useMediaQuery } from '@siberiacancode/reactuse';
import { useRef, useState } from 'react';

import { SESSIONS } from '../../../config';
import { useProfileContext } from '../../context';
import { usePlayerSessions } from '../use-profile-queries';

export const useSessionsTab = () => {
  const { accountId, nickname } = useProfileContext();
  const isStacked = useMediaQuery(SESSIONS.stackedQuery);

  const [limit, setLimit] = useState<number>(SESSIONS.pageSize);
  const [selected, setSelected] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const query = usePlayerSessions(limit);

  const select = (sessionId: string) => {
    setSelected(sessionId);

    if (isStacked) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return {
    accountId,
    nickname,
    query,
    detailRef,
    selectedId: selected ?? query.data?.items[0]?.id,
    select,
    showMore: () => setLimit((current) => current + SESSIONS.pageSize)
  };
};
