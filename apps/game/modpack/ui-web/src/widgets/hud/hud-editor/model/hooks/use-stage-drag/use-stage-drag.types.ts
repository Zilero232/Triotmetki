import type { RefObject } from 'react';

import type { Drag } from '@/entities/hud/panel-layout';
import type { ClientSize } from '@/shared/api/gameface';

export type UseStageDragInput = {
  screenRef: RefObject<ClientSize>;
};

export type StageDrag = Drag & { moved: boolean };
