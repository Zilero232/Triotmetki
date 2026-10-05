import type { RefObject } from 'react';

import type { Size } from '@/entities/hud/panel-layout';

export type UseStageWidthInput = { stageRef: RefObject<HTMLDivElement | null>; screen: Size };

export type RoomInput = { box: HTMLElement; stage: HTMLElement | null };
