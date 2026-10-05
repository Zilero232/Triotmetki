import type { BrowserStatusProps } from './BrowserStatus.types';

import { ReplayIcon } from '../ReplayIcon';

import s from './BrowserStatus.module.scss';

export const BrowserStatus = ({ title, text, progress = null, children }: BrowserStatusProps) => (
  <div aria-live='polite' className={s.status} role='status'>
    <ReplayIcon className={s.icon} name='play' size={40} />
    {title && <p className={s.title}>{title}</p>}
    <p className={s.text}>{text}</p>
    {progress !== null && (
      <span className={s.track}>
        <span className={s.fill} style={{ width: `${progress}%` }} />
      </span>
    )}
    {children}
  </div>
);
