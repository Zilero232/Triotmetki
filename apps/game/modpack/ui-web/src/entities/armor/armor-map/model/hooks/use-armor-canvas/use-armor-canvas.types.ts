import type { RefObject } from 'react';

import type { CanvasScreen } from '../../../lib/canvas-screen';
import type { ArmorMapData } from '../../schemas';

export type ArmorDrawReport = { width: number; height: number; cells: number; ms: number };

export type UseArmorCanvasInput = { map: ArmorMapData | null; onDrawn?: (report: ArmorDrawReport) => void };

export type UseArmorCanvasResult = { ref: RefObject<HTMLCanvasElement | null>; screen: CanvasScreen };
