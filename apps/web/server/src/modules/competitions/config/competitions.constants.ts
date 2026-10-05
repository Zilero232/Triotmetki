export const COMPETITION_QUEUE = {
  name: 'competitions',
  jobs: { score: 'score' }
} as const;

export const COMPETITION_SCHEDULES = [
  {
    id: 'competitions-score',
    queue: COMPETITION_QUEUE.name,
    name: COMPETITION_QUEUE.jobs.score,
    repeat: { pattern: '*/15 * * * *' }
  }
] as const;

export const COMPETITION_RUN = {
  finishGraceHours: 6,
  battlesFetchFactor: 4,
  maxActivePerOwner: 5,
  inviteAlphabet: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
  slugSuffixAlphabet: '0123456789abcdefghijklmnopqrstuvwxyz',
  slugSuffixLength: 6,
  plusFeature: 'privateCompetitions'
} as const;

export const NO_SCORE = { score: 0, battles: 0, source: 'none' } as const;
