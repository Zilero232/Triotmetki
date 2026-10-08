'use client';

import { BellRing, Check, RefreshCw, Trash2, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Badge, Button, ConfirmDialog, IconButton } from '@/ui-kit';

import type { EventCardProps } from './EventCard.types';

import { ATTENDANCE_TONES, EVENT_KIND_TONES } from '../../../config';
import { useEventActions } from '../../../model/hooks';
import { AttendanceDialog, EditEventDialog } from './components';

import s from './EventCard.module.scss';

export const EventCard = ({ clanId, event, isOfficer, members }: EventCardProps) => {
  const t = useTranslations('clanWorkspace');
  const format = useFormatter();
  const { attendance, reminder, myStatus, hasStarted, canSync, isRsvpPending, isRemoving, isSyncing, onRsvp, onRemove, onSync } = useEventActions({
    clanId,
    event
  });

  return (
    <article className={s.root} data-kind={event.kind}>
      <header className={s.head}>
        <Badge shape='pill' tone={EVENT_KIND_TONES[event.kind]}>
          {t(`kinds.${event.kind}`)}
        </Badge>
        <h3 className={s.title}>{event.title}</h3>
        <time className={s.time} dateTime={event.startsAt}>
          {format.dateTime(new Date(event.startsAt), 'dateTime')}
          {event.endsAt && ` — ${format.dateTime(new Date(event.endsAt), 'time')}`}
        </time>
      </header>
      <p className={s.reminder}>
        <BellRing aria-hidden size={14} />
        {reminder}
      </p>
      <ul aria-label={t('attendance.summary')} className={s.counts}>
        {attendance.map(({ status, count }) => (
          <li key={status}>
            <Badge shape='pill' tone={ATTENDANCE_TONES[status]}>
              {t('attendance.count', { status: t(`attendance.statuses.${status}`), count })}
            </Badge>
          </li>
        ))}
      </ul>
      <footer className={s.actions}>
        {!hasStarted && (
          <div aria-label={t('events.rsvp')} className={s.rsvp} role='group'>
            <Button
              aria-pressed={myStatus === 'confirmed'}
              disabled={isRsvpPending}
              size='sm'
              variant={myStatus === 'confirmed' ? 'primary' : 'secondary'}
              onClick={() => onRsvp('confirmed')}
            >
              <Check aria-hidden size={14} />
              {t('events.going')}
            </Button>
            <Button
              aria-pressed={myStatus === 'declined'}
              disabled={isRsvpPending}
              size='sm'
              variant={myStatus === 'declined' ? 'secondary' : 'ghost'}
              onClick={() => onRsvp('declined')}
            >
              <X aria-hidden size={14} />
              {t('events.notGoing')}
            </Button>
          </div>
        )}
        {isOfficer && (
          <div className={s.officer}>
            <EditEventDialog clanId={clanId} event={event} />
            <AttendanceDialog clanId={clanId} event={event} members={members} />
            {canSync && (
              <IconButton aria-label={t('events.sync')} disabled={isSyncing} size='sm' variant='outline' onClick={onSync}>
                <RefreshCw size={14} />
              </IconButton>
            )}
            <ConfirmDialog
              trigger={
                <IconButton aria-label={t('events.remove')} size='sm' variant='ghost'>
                  <Trash2 size={14} />
                </IconButton>
              }
              cancelLabel={t('events.cancel')}
              confirmLabel={t('events.remove')}
              isPending={isRemoving}
              title={t('events.removeTitle', { title: event.title })}
              tone='danger'
              onConfirm={onRemove}
            />
          </div>
        )}
      </footer>
    </article>
  );
};
