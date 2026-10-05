import type { Frame } from '../../../lib/frame';

export type PersistInput = {
  frame: Frame;
  zoom: number;
  placed?: boolean;
};
