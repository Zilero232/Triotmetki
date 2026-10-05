'use client';

import type { CameraBridgeProps } from './CameraBridge.types';

import { useCameraBridge } from '../../../../../model/hooks/use-camera-bridge';

export const CameraBridge = (props: CameraBridgeProps) => {
  'use no memo';

  useCameraBridge(props);

  return null;
};
