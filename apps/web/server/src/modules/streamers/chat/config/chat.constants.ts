export const CHAT_COMMANDS = ['stat', 'session', 'marks', 'settings'] as const;

export const CHAT_LINKS = {
  streamer: '/s',
  settings: 'settings'
} as const;

export const CHAT_COPY = {
  files: {
    ru: new URL('./locales/ru.ftl', import.meta.url),
    en: new URL('./locales/en.ftl', import.meta.url)
  },
  missing: 'none',
  messages: {
    stat: 'chat-stat',
    session: 'chat-session',
    sessionNone: 'chat-session-none',
    marks: 'chat-marks',
    settings: 'chat-settings',
    settingsNone: 'chat-settings-none',
    challengeActive: 'chat-challenge-active',
    challengeSucceeded: 'chat-challenge-succeeded',
    challengeFailed: 'chat-challenge-failed',
    challengeExpired: 'chat-challenge-expired',
    predictionTitle: 'chat-prediction-title',
    predictionYes: 'chat-prediction-yes',
    predictionNo: 'chat-prediction-no'
  }
} as const;
