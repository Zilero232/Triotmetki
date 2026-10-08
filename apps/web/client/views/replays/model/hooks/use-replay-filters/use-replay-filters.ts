'use client';

import { useDebounceValue } from '@siberiacancode/reactuse';
import { useQueryStates } from 'nuqs';
import { mapValues, omit } from 'remeda';

import type { ReplayFilters } from '../../../lib/replay-query';
import type { ReplayFiltersPatch } from './use-replay-filters.types';

import { REPLAY_LIST, REPLAYS_URL_PARSERS } from '../../../config';

export const useReplayFilters = () => {
  const [state, setState] = useQueryStates(REPLAYS_URL_PARSERS, { history: 'replace' });
  const player = useDebounceValue(state.player, REPLAY_LIST.playerDebounceMs);
  const clan = useDebounceValue(state.clan, REPLAY_LIST.playerDebounceMs);

  const { tab, player: playerDraft, clan: clanDraft, ...rest } = state;

  const filters: ReplayFilters = { ...rest, player, clan };

  const update = (patch: ReplayFiltersPatch) => void setState(patch);

  return {
    tab,
    playerDraft,
    clanDraft,
    filters,
    update,
    setTab: (next: typeof tab) => void setState({ tab: next }),
    reset: () => void setState(mapValues(omit(REPLAYS_URL_PARSERS, ['tab', 'sort']), () => null))
  };
};
