type RankedOverlay = {
  id: string;
  createdAt: Date;
};

export type PausedOverlaysInput = {
  overlays: readonly RankedOverlay[];
  isPlus: boolean;
};
