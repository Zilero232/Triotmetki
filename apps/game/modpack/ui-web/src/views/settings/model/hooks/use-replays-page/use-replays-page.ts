import { useStore } from '@nanostores/react';
import { useEffect, useMemo } from 'react';

import { REPLAYS } from '@/entities/replay/replay';
import { $components, $feed, toggleSwitch, unwatchFeed, watchFeed } from '@/entities/window/window-state';

export const useReplaysPage = () => {
  const component = useStore($components).find(({ page }) => page?.kind === REPLAYS.pageKind) ?? null;
  const feed = useStore($feed);
  const componentId = component?.id ?? null;

  useEffect(() => {
    if (componentId === null) {
      return undefined;
    }

    watchFeed(componentId);

    return () => unwatchFeed(componentId);
  }, [componentId]);

  const page = useMemo(() => {
    if (feed?.component !== componentId) {
      return undefined;
    }

    return feed.page ? { ...feed.page, items: feed.items } : null;
  }, [feed, componentId]);

  return component ? { page, enabled: component.switch?.value ?? true, turnOn: () => toggleSwitch(component) } : null;
};
