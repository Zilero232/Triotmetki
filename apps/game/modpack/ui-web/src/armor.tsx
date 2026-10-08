import '@/shared/lib/engine-shims/install';

import { mountOnce, onDomReady } from '@/shared/lib/dom';
import { ARMOR_PAGE, ArmorViewer } from '@/views/armor-viewer';

import '@/shared/styles/armor.scss';

onDomReady(() => mountOnce({ id: ARMOR_PAGE.rootId, node: <ArmorViewer /> }));
