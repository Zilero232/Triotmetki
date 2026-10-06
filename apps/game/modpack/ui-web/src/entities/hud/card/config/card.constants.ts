export const CARD = {
  statuses: ['active', 'done', 'honors', 'failed', 'idle'],
  headerIcon: 20,
  rowIcon: 16,
  chipIcon: 16,
  status: {
    active: { icon: 'otmetki:dot', tone: 'accent' },
    done: { icon: 'otmetki:check', tone: 'good' },
    honors: { icon: 'otmetki:check_double', tone: 'gold' },
    failed: { icon: 'otmetki:cross', tone: 'bad' },
    idle: { icon: 'otmetki:dot', tone: 'dim' }
  }
} as const;
