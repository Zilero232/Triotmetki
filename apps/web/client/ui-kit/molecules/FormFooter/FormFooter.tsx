import { clsx } from 'clsx';

import type { FormFooterProps } from './FormFooter.types';

import s from './FormFooter.module.scss';

export const FormFooter = ({ hint, children, className }: FormFooterProps) => (
  <div className={clsx(s.root, className)}>
    {hint && <p className={s.hint}>{hint}</p>}
    <div className={s.actions}>{children}</div>
  </div>
);
