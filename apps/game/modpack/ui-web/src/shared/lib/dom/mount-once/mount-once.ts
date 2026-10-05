import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { DOM } from '@/shared/config';

import type { MountOnceInput, Unmount } from './mount-once.types';

const mountedHosts = new WeakSet<HTMLElement>();

const createHost = (id: string): HTMLElement => {
  const host = document.createElement(DOM.hostTag);

  host.id = id;
  document.body.appendChild(host);

  return host;
};

export const mountOnce = ({ id, node }: MountOnceInput): Unmount => {
  const existing = document.getElementById(id);

  if (existing && mountedHosts.has(existing)) {
    return () => undefined;
  }

  const host = existing ?? createHost(id);
  const root = createRoot(host);

  mountedHosts.add(host);

  // eslint-disable-next-line react/dom-no-flush-sync -- the page mounts once and its first frame must be drawn before the engine shows the view
  flushSync(() => {
    root.render(node);
  });

  return () => {
    root.unmount();
    mountedHosts.delete(host);

    if (!existing) {
      host.parentNode?.removeChild(host);
    }
  };
};
