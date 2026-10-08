'use client';

import { useReplayMapName } from '@/features/community/replay-meta';

import { useReplayColumns } from '../use-replay-columns';
import { useReplayVehicle } from '../use-replay-vehicle';
import { useReplaysFeed } from '../use-replays-feed';

export const useReplayBrowser = () => {
  const feed = useReplaysFeed();
  const columns = useReplayColumns();
  const vehicleOf = useReplayVehicle();
  const mapNameOf = useReplayMapName();

  return { ...feed, columns, vehicleOf, mapNameOf };
};
