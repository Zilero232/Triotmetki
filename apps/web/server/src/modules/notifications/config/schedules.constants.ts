import type { JobSchedule } from '../../../common/lib';

import { NOTIFICATIONS_JOB, NOTIFICATIONS_QUEUE } from './notifications-queue.constants';

export const NOTIFICATION_SCHEDULES = [
  { id: 'notifications-marks-watch', queue: NOTIFICATIONS_QUEUE.events, name: NOTIFICATIONS_JOB.events.marksWatch, repeat: { every: 60_000 } },
  {
    id: 'notifications-session-reports',
    queue: NOTIFICATIONS_QUEUE.events,
    name: NOTIFICATIONS_JOB.events.sessionReports,
    repeat: { every: 5 * 60_000 }
  },
  {
    id: 'notifications-threshold-drops',
    queue: NOTIFICATIONS_QUEUE.events,
    name: NOTIFICATIONS_JOB.events.thresholdDrops,
    repeat: { pattern: '45 6 * * *' }
  },
  {
    id: 'notifications-weekly-digest',
    queue: NOTIFICATIONS_QUEUE.events,
    name: NOTIFICATIONS_JOB.events.weeklyDigest,
    repeat: { pattern: '0 10 * * 1' }
  },
  {
    id: 'notifications-first-win-reminders',
    queue: NOTIFICATIONS_QUEUE.events,
    name: NOTIFICATIONS_JOB.events.firstWinReminders,
    repeat: { pattern: '0 18 * * *' }
  }
] as const satisfies readonly JobSchedule[];
