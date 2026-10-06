export const DAMAGE_LOG = {
  iconSize: 16,
  classIcon: { width: 13, height: 16 },
  totalIconSize: 14,
  critIconSize: 12,
  hitsPrefix: '×',
  bar: { width: 36, height: 4, minTook: 1 },
  shellKinds: ['ap', 'apcr', 'heat', 'he'],
  otherShell: 'other',
  sections: ['dealt', 'received']
} as const;
