import type { ViewerSide, ViewerState } from '../viewer-protocol';

export type MockSides = Record<ViewerSide, ViewerState>;

export type NextMockStateInput = { sides: MockSides; state: ViewerState; raw: string };
