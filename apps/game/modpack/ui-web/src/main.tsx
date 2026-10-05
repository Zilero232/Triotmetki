import '@/shared/lib/engine-shims/install';

import { mountOnce, onDomReady } from '@/shared/lib/dom';
import { App, SETTINGS_PAGE } from '@/views/settings';

import '@/shared/styles/settings.scss';

onDomReady(() => mountOnce({ id: SETTINGS_PAGE.rootId, node: <App /> }));
