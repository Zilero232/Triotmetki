import type { Locale } from 'date-fns';

export type DateCalendarProps = {
  selectedDay: Date | undefined;
  dayLocale: Locale;
  onDaySelect: (day: Date | undefined) => void;
};
