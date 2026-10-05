import { WEBHOOK } from '../../config/webhook.constants';

export const webhookUrl = (base: string): string => new URL(`/${WEBHOOK.path}`, base).href;
