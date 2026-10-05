import type { Env } from '../../../../config';

export type WebPushEnv = Pick<Env, 'VAPID_PRIVATE_KEY' | 'VAPID_PUBLIC_KEY' | 'VAPID_SUBJECT'>;

export type VapidDetails = {
  subject: string;
  publicKey: string;
  privateKey: string;
};
