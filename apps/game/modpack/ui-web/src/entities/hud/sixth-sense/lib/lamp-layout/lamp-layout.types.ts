export type LampRect = { left: number; top: number; width: number; height: number };

export type LampLayoutInput = { ring: number; text: boolean; timer: boolean };

export type LampLayout = { box: LampRect; ring: LampRect; text: LampRect | null; seconds: LampRect | null };
