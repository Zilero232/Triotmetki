import type { StreamerCard } from '@otmetki/schemas';

import type { ToStreamerCardInput } from './streamer-card.types';

import { toIso } from '../../../../common/lib';
import { toChannelView } from './channel.mappers';

export const toStreamerCard = ({ profile, rating, marks3, favourites, vehicles }: ToStreamerCardInput): StreamerCard => ({
  slug: profile.slug,
  displayName: profile.displayName,
  kind: profile.kind,
  channels: profile.channels.map(toChannelView),
  live:
    profile.isLive && profile.livePlatform
      ? {
          platform: profile.livePlatform,
          viewers: profile.liveViewers,
          tankId: profile.liveTankId,
          tankName: profile.liveTankId ? (vehicles[String(profile.liveTankId)]?.name ?? null) : null,
          checkedAt: toIso(profile.liveCheckedAt)
        }
      : null,
  stats: rating ? { battles: rating.battles, winRate: rating.winRate, wn8: rating.wn8 } : null,
  marks3,
  favouriteTanks: favourites.map((row) => ({
    tankId: row.tankId,
    name: vehicles[String(row.tankId)]?.name ?? null,
    battles: row.battles
  })),
  hasSettings: profile.settings !== null
});
