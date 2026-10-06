import { round } from 'remeda';

import type { ClientSize } from '@/shared/api/gameface';

import { gameface } from '@/shared/api/gameface';

import type { Frame, Viewport } from '../frame';

const sizeText = (value: ClientSize | null): string => (value ? `${round(value.width, 2)}x${round(value.height, 2)}` : 'n/a');

export const describeFrame = ({ x, y, width, height }: Frame): string => `${round(x, 2)},${round(y, 2)} ${round(width, 2)}x${round(height, 2)} rem`;

export const describeViewport = ({ screen, view, scale }: Viewport): string =>
  [
    `screen ${sizeText(screen)} rem`,
    `client ${sizeText(gameface.clientSize())} px`,
    `clientRem ${sizeText(gameface.clientSizeRem())}`,
    `scale ${round(scale, 2)} (remToPx ${gameface.remScale() ?? 'n/a'}, html font ${getComputedStyle(document.documentElement).fontSize})`,
    `view ${round(view.x, 2)},${round(view.y, 2)} ${sizeText(view)} rem (engine ${gameface.viewRect() ? 'yes' : 'no'})`,
    `inner ${window.innerWidth}x${window.innerHeight} px`
  ].join(', ');
