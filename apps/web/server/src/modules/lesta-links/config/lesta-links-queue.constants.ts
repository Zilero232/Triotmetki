export const LESTA_LINKS_QUEUE = {
  name: 'lesta-links',
  jobs: {
    garageDispatch: 'garage-dispatch',
    garage: 'garage',
    prolongate: 'prolongate'
  },
  scopes: ['pending', 'all']
} as const;

export const LESTA_LINKS_SCHEDULES = [
  {
    id: 'lesta-links-garage-pending',
    queue: LESTA_LINKS_QUEUE.name,
    name: LESTA_LINKS_QUEUE.jobs.garageDispatch,
    repeat: { every: 5 * 60_000 },
    data: { scope: 'pending' },
    needsLesta: true
  },
  {
    id: 'lesta-links-garage-daily',
    queue: LESTA_LINKS_QUEUE.name,
    name: LESTA_LINKS_QUEUE.jobs.garageDispatch,
    repeat: { pattern: '20 5 * * *' },
    data: { scope: 'all' },
    needsLesta: true
  },
  {
    id: 'lesta-links-prolongate-daily',
    queue: LESTA_LINKS_QUEUE.name,
    name: LESTA_LINKS_QUEUE.jobs.prolongate,
    repeat: { pattern: '40 4 * * *' },
    needsLesta: true
  }
] as const;
