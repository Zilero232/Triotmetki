import replaysPage from '@/entities/replay/replay/_tests/fixtures/replays-page.sample.json';
import { applyDesignRem, createDevGameface, relayEscape } from '@/shared/api/gameface/dev-bridge';
import { installGamefaceMock } from '@/shared/api/gameface/mock';
import { createArmorDevGameface, isArmorPage } from '@/views/armor-viewer';
import { createViewerDevGameface, isViewerPage } from '@/views/hit-viewer';

const pageMock = () => {
  const path = window.location.pathname;

  if (isViewerPage(path)) {
    return createViewerDevGameface();
  }

  if (isArmorPage(path)) {
    return createArmorDevGameface();
  }

  return createDevGameface({ replaysPage });
};

const mock = pageMock();

applyDesignRem();
installGamefaceMock(mock);
relayEscape(mock);
