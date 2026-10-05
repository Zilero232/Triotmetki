export const MOD_BATTLE_SUM = {
  damageDealt: true,
  frags: true,
  spotted: true,
  capturePoints: true,
  droppedCapturePoints: true
} as const;

export const API_DELTA_SUM = { ...MOD_BATTLE_SUM, battles: true, wins: true } as const;
