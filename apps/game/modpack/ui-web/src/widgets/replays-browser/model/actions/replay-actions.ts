import type { ReplayItem } from '../../../../entities/replays';
import type { RunReplayActionInput } from './replay-actions.types';

import { REPLAYS } from '../../../../entities/replays';
import { send } from '../../../../shared/api/protocol';

export const runReplayAction = ({ action, row, value }: RunReplayActionInput): boolean =>
  send({ type: 'action', component: REPLAYS.componentId, action, row, value });

const openSitePath = (path: string): boolean => send({ type: 'open', path });

export const replayCommands = {
  toggleFavourite: (item: ReplayItem) =>
    runReplayAction({ action: REPLAYS.actions.favourite, row: item.id, value: item.favourite ? REPLAYS.favouriteOff : REPLAYS.favouriteOn }),
  upload: (item: ReplayItem) => runReplayAction({ action: REPLAYS.actions.upload, row: item.id }),
  openHits: (item: ReplayItem) => runReplayAction({ action: REPLAYS.actions.hits, row: item.id }),
  openSite: (item: ReplayItem) => {
    if (item.site?.link) {
      openSitePath(item.site.link);
    }
  },
  openSiteList: () => openSitePath(REPLAYS.siteListPath),
  refresh: () => runReplayAction({ action: REPLAYS.actions.refresh }),
  openFolder: () => runReplayAction({ action: REPLAYS.actions.folder })
};
