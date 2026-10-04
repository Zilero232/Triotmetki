import '../../shared/lib/engine-shims/install';

import { mountOnce, onDomReady } from '../../shared/lib/dom';
import { HitViewer } from '../../widgets/hit-viewer';
import { VIEWER_PAGE } from './config';

import './styles/global.scss';

onDomReady(() => mountOnce({ id: VIEWER_PAGE.rootId, node: <HitViewer /> }));
