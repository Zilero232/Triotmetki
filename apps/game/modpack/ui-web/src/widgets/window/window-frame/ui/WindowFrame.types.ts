import type { ReactNode } from 'react';

import type { useWindowFrame } from '../model/hooks';

export type WindowFrameModel = ReturnType<typeof useWindowFrame>;

export type WindowFrameProps = {
  frame: WindowFrameModel;
  label: string;
  children: ReactNode;
};
