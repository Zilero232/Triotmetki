import { fromUnixTime } from 'date-fns';

export const fromUnixSeconds = (seconds: number | null): Date | null => (seconds === null ? null : fromUnixTime(seconds));
