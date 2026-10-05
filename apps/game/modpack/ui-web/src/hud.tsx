import '@/shared/lib/engine-shims/install';

import { mountOnce, onDomReady } from '@/shared/lib/dom';
import { HUD_PAGE, HudOverlay } from '@/views/hud';

import '@/shared/styles/hud.scss';

onDomReady(() => mountOnce({ id: HUD_PAGE.rootId, node: <HudOverlay /> }));
