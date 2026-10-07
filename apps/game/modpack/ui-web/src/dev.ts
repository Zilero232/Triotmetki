import replaysPage from '@/entities/replay/replay/_tests/fixtures/replays-page.sample.json';
import { applyDesignRem, createDevGameface, relayEscape } from '@/shared/api/gameface/dev-bridge';
import { installGamefaceMock } from '@/shared/api/gameface/mock';
import { createViewerDevGameface, isViewerPage } from '@/views/hit-viewer';

const mock = isViewerPage(window.location.pathname) ? createViewerDevGameface() : createDevGameface({ replaysPage });

applyDesignRem();
installGamefaceMock(mock);
relayEscape(mock);
