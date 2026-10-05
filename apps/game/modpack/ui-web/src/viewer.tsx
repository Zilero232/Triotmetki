import '@/shared/lib/engine-shims/install';

import { mountOnce, onDomReady } from '@/shared/lib/dom';
import { HitViewer, VIEWER_PAGE } from '@/views/hit-viewer';

import '@/shared/styles/viewer.scss';

onDomReady(() => mountOnce({ id: VIEWER_PAGE.rootId, node: <HitViewer /> }));
