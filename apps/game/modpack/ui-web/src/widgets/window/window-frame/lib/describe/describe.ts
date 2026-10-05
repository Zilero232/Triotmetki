import type { ClientSize } from '@/shared/api/gameface';

import { gameface } from '@/shared/api/gameface';
import { round2 } from '@/shared/lib/page-diag';

import type { Frame, Viewport } from '../frame';

const sizeText = (value: ClientSize | null): string => (value ? `${round2(value.width)}x${round2(value.height)}` : 'n/a');

export const describeFrame = ({ x, y, width, height }: Frame): string => `${round2(x)},${round2(y)} ${round2(width)}x${round2(height)} rem`;

export const describeViewport = ({ screen, view, scale }: Viewport): string =>
  [
    `screen ${sizeText(screen)} rem`,
    `client ${sizeText(gameface.clientSize())} px`,
    `clientRem ${sizeText(gameface.clientSizeRem())}`,
    `scale ${round2(scale)} (remToPx ${gameface.remScale() ?? 'n/a'}, html font ${getComputedStyle(document.documentElement).fontSize})`,
    `view ${round2(view.x)},${round2(view.y)} ${sizeText(view)} rem (engine ${gameface.viewRect() ? 'yes' : 'no'})`,
    `inner ${window.innerWidth}x${window.innerHeight} px`
  ].join(', ');
