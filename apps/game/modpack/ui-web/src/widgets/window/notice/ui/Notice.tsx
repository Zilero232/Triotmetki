import clsx from 'clsx';

import type { NoticeProps } from './Notice.types';

import s from './Notice.module.scss';

export const Notice = ({ notice }: NoticeProps) => (
  <div aria-live='polite' className={clsx(s.notice, s[notice.kind])} role='status'>
    {notice.text && <span>{notice.text}</span>}
    {notice.code && <textarea readOnly aria-label={notice.text ?? undefined} className={s.codeField} value={notice.code} />}
  </div>
);
