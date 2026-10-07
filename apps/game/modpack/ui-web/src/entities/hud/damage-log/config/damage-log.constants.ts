export const DAMAGE_LOG = {
  iconSize: 14,
  classIcon: { width: 11, height: 13 },
  totalIconSize: 12,
  critIconSize: 10,
  hitsPrefix: '×',
  bar: { width: 26, height: 3, minTook: 1 },
  shellKinds: ['ap', 'apcr', 'heat', 'he'],
  otherShell: 'other',
  sections: ['dealt', 'received']
} as const;
