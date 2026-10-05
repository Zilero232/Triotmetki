import type { WebhookSubject } from '../../../webhooks';

export type MatchesSubjectInput = {
  filter: unknown;
  subject: WebhookSubject;
};
