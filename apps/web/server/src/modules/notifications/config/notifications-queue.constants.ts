export const NOTIFICATIONS_QUEUE = {
  deliver: 'notifications.deliver',
  events: 'notifications.events'
} as const;

export const NOTIFICATIONS_JOB = {
  deliver: { event: 'event', digest: 'digest' },
  events: {
    marksWatch: 'marks-watch',
    sessionReports: 'session-reports',
    thresholdDrops: 'threshold-drops',
    weeklyDigest: 'weekly-digest',
    firstWinReminders: 'first-win-reminders'
  }
} as const;
