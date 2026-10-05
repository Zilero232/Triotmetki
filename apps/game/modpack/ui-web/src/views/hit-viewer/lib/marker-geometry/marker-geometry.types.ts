import type { ViewerMark } from '../viewer-protocol';

export type ScreenSize = { width: number; height: number };

export type MarkerGeometryInput = { mark: ViewerMark; screen: ScreenSize };

export type MarkerGeometry = { x: number; y: number; length: number; angle: number };
