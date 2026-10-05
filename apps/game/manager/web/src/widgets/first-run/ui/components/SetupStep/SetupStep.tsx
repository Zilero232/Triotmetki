import { CircleCheck, CircleDashed } from 'lucide-react';

import type { SetupStepProps } from './SetupStep.types';

import s from './SetupStep.module.scss';

export const SetupStep = ({ title, isDone = false, children }: SetupStepProps) => (
  <li className={s.step} data-done={isDone || undefined}>
    <span aria-hidden className={s.marker}>
      {isDone ? <CircleCheck /> : <CircleDashed />}
    </span>
    <div className={s.body}>
      <h3 className={s.title}>{title}</h3>
      {children}
    </div>
  </li>
);
