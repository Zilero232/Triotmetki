import type { SkippedLook, SkippedLooksInput } from './skipped-looks.types';

export const lookTitle = (id: string) => {
  const text = id
    .split('_')
    .filter((word) => word !== '')
    .join(' ');

  return text === '' ? id : `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`;
};

export const skippedLooks = ({ skipped }: SkippedLooksInput): SkippedLook[] =>
  skipped.filter((look) => look.id !== '').map((look) => ({ id: look.id, title: lookTitle(look.id), reason: look.reason }));
