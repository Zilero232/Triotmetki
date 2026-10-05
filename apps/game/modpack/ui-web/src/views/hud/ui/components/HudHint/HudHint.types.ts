import type { ClientSize } from '@/shared/api/gameface';

import type { PanelHint } from '../../../model/hooks/use-panel-hint';

export type HudHintProps = { hint: PanelHint; screen: ClientSize };
