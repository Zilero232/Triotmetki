import * as z from 'zod';

import { zonedInputToIso } from '@/shared/lib';

import { zCreateClanEvent } from '../../api';
import { REMIND_OPTIONS } from '../../config';
import { toNewWorkspaceEvent } from './event-form';

const localDate = z.string().refine((value) => zonedInputToIso({ value }) !== undefined);

export const eventFormFieldsSchema = z
  .object({
    title: z.string().trim().pipe(zCreateClanEvent.shape.title),
    kind: zCreateClanEvent.shape.kind,
    startsAt: localDate,
    endsAt: z.string(),
    remind: z.enum(REMIND_OPTIONS)
  })
  .refine(
    ({ startsAt, endsAt }) => {
      const end = zonedInputToIso({ value: endsAt });

      return end === undefined || end > (zonedInputToIso({ value: startsAt }) ?? '');
    },
    { path: ['endsAt'] }
  );

export const eventFormSchema = eventFormFieldsSchema.transform(toNewWorkspaceEvent).pipe(zCreateClanEvent);
