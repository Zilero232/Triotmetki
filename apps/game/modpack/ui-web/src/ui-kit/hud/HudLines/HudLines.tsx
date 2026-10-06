import { memo } from 'react';

import type { HudLinesProps } from './HudLines.types';

import { HudRun } from '../HudRun';

import s from './HudLines.module.scss';

export const HudLines = memo(({ lines }: HudLinesProps) =>
  lines.map((line) => (
    <span key={line.key} className={s.line}>
      {line.runs.map((run) => (
        <HudRun key={run.key} run={run} />
      ))}
    </span>
  ))
);
