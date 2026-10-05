export const SPECS: Readonly<{ maxDepth: number; separator: string; skip: readonly string[]; lowerIsBetter: readonly string[] }> = {
  maxDepth: 4,
  separator: '.',
  skip: ['moduleIds', 'modules'],
  lowerIsBetter: [
    'reloadTime',
    'aimingTime',
    'dispersion',
    'dispersionMovement',
    'dispersionHullRotation',
    'dispersionTurretRotation',
    'dispersionAfterShot',
    'weight',
    'interval'
  ]
};

export const COMPARE_PROFILE = {
  preferred: 'top',
  fallback: 'default'
} as const;
