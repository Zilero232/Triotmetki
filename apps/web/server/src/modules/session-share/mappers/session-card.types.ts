import type { ParsedNotification } from '../../notifications';

export type SessionCardNotification = Extract<ParsedNotification, { event: 'sessionFinished' }>;
