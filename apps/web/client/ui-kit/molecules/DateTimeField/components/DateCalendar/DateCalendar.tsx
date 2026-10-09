'use client';

import { useTranslations } from 'next-intl';
import { DayPicker } from 'react-day-picker';

import { TIME_ZONE } from '@/shared/i18n';

import type { DateCalendarProps } from './DateCalendar.types';

import s from '../../DateTimeField.module.scss';

export const DateCalendar = ({ selectedDay, dayLocale, onDaySelect }: DateCalendarProps) => {
  const t = useTranslations('common.dateTime');

  return (
    <DayPicker
      fixedWeeks
      showOutsideDays
      classNames={{
        root: s.calendar,
        months: s.months,
        month: s.month,
        month_caption: s.caption,
        caption_label: s.captionLabel,
        nav: s.nav,
        button_previous: s.navButton,
        button_next: s.navButton,
        chevron: s.chevron,
        month_grid: s.grid,
        weekdays: s.weekdays,
        weekday: s.weekday,
        week: s.week,
        day: s.day,
        day_button: s.dayButton,
        today: s.today,
        selected: s.selected,
        outside: s.outside,
        disabled: s.disabled
      }}
      defaultMonth={selectedDay}
      labels={{ labelNext: () => t('nextMonth'), labelPrevious: () => t('previousMonth') }}
      locale={dayLocale}
      mode='single'
      selected={selectedDay}
      timeZone={TIME_ZONE}
      weekStartsOn={1}
      onSelect={onDaySelect}
    />
  );
};
