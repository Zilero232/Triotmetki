import type { RefObject } from 'react';

import type { CanvasScreen } from '../../../lib/canvas-screen';

export type UseArmorCanvasResult = { ref: RefObject<HTMLCanvasElement | null>; screen: CanvasScreen };
