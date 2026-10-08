import type { CameraMove, ScreenPoint } from '../../../lib/camera-move';

export type UseOrbitCameraInput = {
  onMove: (move: CameraMove) => void;
  onHover?: (point: ScreenPoint) => void;
  onLeave?: () => void;
};
