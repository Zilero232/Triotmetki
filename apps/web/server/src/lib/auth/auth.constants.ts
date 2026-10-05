import { secondsInDay } from 'date-fns/constants';

export const SESSION = {
  expiresIn: 30 * secondsInDay,
  updateAge: secondsInDay,
  freshAge: secondsInDay
} as const;

export const PLACEHOLDER_EMAIL = {
  domain: 'users.otmetki.invalid'
} as const;

export const AUTH_PROVIDER = {
  lesta: 'lesta-id',
  telegram: 'telegram',
  discord: 'discord',
  vk: 'vk'
} as const;

export const API_KEY_PLUGIN = {
  modelName: 'apiKey',
  prefix: 'otm_',
  keyLength: 64,
  minExpiresInDays: 0,
  maxExpiresInDays: 3_650,
  disabledPaths: ['/api-key/create', '/api-key/update', '/api-key/delete', '/api-key/list', '/api-key/get']
} as const;

export const AUTH_RATE_LIMIT = {
  prefix: 'otmetki:auth:rate:',
  window: 60,
  max: 300,
  callback: { window: 60, max: 60 },
  callbackPaths: ['/lesta/callback', '/callback/*'],
  signIn: { window: 60, max: 30 },
  signInPaths: ['/lesta/*', '/telegram/callback', '/telegram/webapp', '/vk/*', '/sign-in/*', '/magic-link/*', '/link-social']
} as const;

export const VK_MINI_APP_AUTH = {
  maxAgeSeconds: 3_600,
  launchParamsMaxLength: 4096,
  fallbackName: 'VK {id}'
} as const;
