import clsx from 'clsx';

import { TabularText } from '@/ui-kit';

import type { ReloadBoxProps } from './ReloadBox.types';

import { RETICLE_READOUTS } from '../../../config';

import s from './ReloadBox.module.scss';

const { box, leader, canvas } = RETICLE_READOUTS;

export const ReloadBox = ({ reload }: ReloadBoxProps) => (
  <div className={s.anchor} style={{ right: `${String(canvas.width / 2 + box.offset - leader)}rem` }}>
    {reload.clip && (
      <div className={s.clip}>
        {Array.from({ length: reload.clip.size }, (_, index) => (
          <span key={index} className={clsx(s.cell, index < (reload.clip?.loaded ?? 0) && s.loaded)} />
        ))}
      </div>
    )}
    <div className={s.row}>
      <div className={clsx(s.box, s[reload.state])} style={{ width: `${String(box.width)}rem`, height: `${String(box.height)}rem` }}>
        <TabularText className={s.value} text={reload.value} />
      </div>
      <span className={s.leader} style={{ width: `${String(leader)}rem` }} />
    </div>
    {reload.full && <TabularText className={s.full} text={reload.full} />}
  </div>
);
