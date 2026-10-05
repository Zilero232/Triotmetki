import { Check } from 'lucide-react';

import type { SetupStepProps } from './SetupStep.types';

import s from './SetupStep.module.scss';

export const SetupStep = ({ index, title, isDone = false, doneLabel, children }: SetupStepProps) => (
  <li className={s.step} data-done={isDone || undefined}>
    <span aria-hidden className={s.marker}>
      {isDone ? <Check strokeWidth={3} /> : index}
    </span>
    <div className={s.body}>
      <h3 className={s.title}>
        {title}
        {isDone && <span className={s.srOnly}>{doneLabel}</span>}
      </h3>
      {children}
    </div>
  </li>
);
