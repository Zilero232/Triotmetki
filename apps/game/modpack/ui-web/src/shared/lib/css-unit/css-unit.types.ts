export type RemBoxInput = { width: number; height: number };

export type RemBox = { width: string; height: string };

export type RemRectInput = RemBoxInput & { left: number; top: number };

export type RemRect = RemBox & { left: string; top: string };
