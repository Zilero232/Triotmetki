'use client';

import { Popover } from '@base-ui/react/popover';
import { clsx } from 'clsx';
import { CalendarClock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

import { useDateTimeField, useFormControl } from '@/shared/lib';

import type { DateTimeFieldProps } from './DateTimeField.types';

import { Button } from '../../atoms';
import { TimeSpin } from './components';
import { DATE_TIME_FIELD_VIEW } from './DateTimeField.constants';

import s from './DateTimeField.module.scss';

const DateCalendar = dynamic(() => import('./components/DateCalendar').then((module) => module.DateCalendar), {
  ssr: false,
  loading: () => <div aria-hidden className={s.calendarPlaceholder} />
});

export const DateTimeField = ({
  value,
  placeholder,
  stepMinutes = DATE_TIME_FIELD_VIEW.stepMinutes,
  isInvalid = false,
  className,
  'aria-label': ariaLabel,
  onChange
}: DateTimeFieldProps) => {
  const t = useTranslations('common.dateTime');
  const control = useFormControl();
  const {
    isOpen,
    selectedDay,
    hours,
    minutes,
    display,
    dayLocale,
    onOpenChange,
    onDaySelect,
    onHoursChange,
    onMinutesChange,
    onNow,
    onClear,
    onDone
  } = useDateTimeField({ value, stepMinutes, onChange });

  return (
    <Popover.Root open={isOpen} onOpenChange={onOpenChange}>
      <div className={clsx(s.root, className)} data-invalid={isInvalid || control['aria-invalid'] || undefined}>
        <Popover.Trigger
          aria-describedby={control['aria-describedby']}
          aria-label={ariaLabel}
          className={s.trigger}
          data-empty={!display || undefined}
          id={control.id}
        >
          <CalendarClock aria-hidden className={s.icon} size={DATE_TIME_FIELD_VIEW.iconSize} />
          <span className={s.value}>{display ?? placeholder ?? t('placeholder')}</span>
          <span className={s.zone} title={t('zoneHint')}>
            {t('zone')}
          </span>
        </Popover.Trigger>
        {display && (
          <button aria-label={t('clear')} className={s.clear} type='button' onClick={onClear}>
            <X size={14} />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Positioner align='start' className={s.positioner} sideOffset={6}>
          <Popover.Popup className={s.popup}>
            <DateCalendar dayLocale={dayLocale} selectedDay={selectedDay} onDaySelect={onDaySelect} />
            <div className={s.time}>
              <span className={s.timeLabel}>{t('time')}</span>
              <TimeSpin
                decrementLabel={t('hoursDown')}
                incrementLabel={t('hoursUp')}
                label={t('hours')}
                max={DATE_TIME_FIELD_VIEW.hours.max}
                min={DATE_TIME_FIELD_VIEW.hours.min}
                value={hours}
                onValueChange={onHoursChange}
              />
              <span aria-hidden className={s.colon}>
                :
              </span>
              <TimeSpin
                decrementLabel={t('minutesDown')}
                incrementLabel={t('minutesUp')}
                label={t('minutes')}
                max={DATE_TIME_FIELD_VIEW.minutes.max}
                min={DATE_TIME_FIELD_VIEW.minutes.min}
                step={stepMinutes}
                value={minutes}
                onValueChange={onMinutesChange}
              />
            </div>
            <p className={s.zoneNote}>{t('zoneHint')}</p>
            <div className={s.actions}>
              <Button size='sm' variant='ghost' onClick={onNow}>
                {t('now')}
              </Button>
              {display && (
                <Button size='sm' variant='ghost' onClick={onClear}>
                  {t('clear')}
                </Button>
              )}
              <Button className={s.done} size='sm' variant='secondary' onClick={onDone}>
                {t('done')}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
