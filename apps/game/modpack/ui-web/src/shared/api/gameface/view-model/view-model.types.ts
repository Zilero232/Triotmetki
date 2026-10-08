import type { GamefaceBridge } from '../gameface.types';

export type ViewModel = Pick<GamefaceBridge, 'escape' | 'feed' | 'onDataChanged' | 'send' | 'state' | 'text'>;
