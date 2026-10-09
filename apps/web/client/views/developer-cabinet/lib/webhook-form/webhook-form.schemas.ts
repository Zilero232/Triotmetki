import { createWebhookEndpointSchema, WEBHOOK, webhookFilterSchema } from '@otmetki/schemas';
import * as z from 'zod';

import type { ReportIssueInput } from './webhook-form.types';

import { WEBHOOK_FORM } from '../../config';
import { parseIdList, toWebhookFilter } from './webhook-form';

export const webhookFormSchema = z
  .object({
    url: createWebhookEndpointSchema.shape.url,
    events: createWebhookEndpointSchema.shape.events,
    accountIds: z.string(),
    clanIds: z.string()
  })
  .superRefine((values, context) => {
    const report = ({ field, message }: ReportIssueInput) => context.addIssue({ code: 'custom', path: [field], message });
    const lists = WEBHOOK_FORM.idFields.map((field) => ({ field, ids: parseIdList(values[field]) }));

    lists.forEach(({ field, ids }) => {
      if (ids === null) {
        report({ field, message: 'ids' });
      } else if (ids.length > WEBHOOK.maxFilterIds) {
        report({ field, message: 'filterTooMany' });
      }
    });

    const isListValid = lists.every(({ ids }) => ids !== null && ids.length <= WEBHOOK.maxFilterIds);

    if (isListValid && !webhookFilterSchema.safeParse(toWebhookFilter(values)).success) {
      report({ field: 'accountIds', message: 'filterEmpty' });
    }
  });
