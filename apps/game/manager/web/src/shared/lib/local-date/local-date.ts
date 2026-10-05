export const fromUnixSeconds = (seconds: number | null): Date | null => (seconds === null ? null : new Date(seconds * 1_000));
