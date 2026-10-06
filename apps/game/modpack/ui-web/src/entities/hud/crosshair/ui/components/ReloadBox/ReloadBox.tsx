import clsx from 'clsx';

import { rem } from '@/shared/lib/css-unit';
import { TabularText } from '@/ui-kit';

import type { ReloadBoxProps } from './ReloadBox.types';

import { RETICLE_READOUTS } from '../../../config';
import { DrumReadout } from '../DrumReadout';

import s from './ReloadBox.module.scss';

const { box, leader, canvas } = RETICLE_READOUTS;

const valueEdge = { marginRight: rem(leader + box.padding) };

export const ReloadBox = ({ reload }: ReloadBoxProps) => (
  <div className={s.anchor} style={{ right: rem(canvas.width / 2 + box.offset - leader) }}>
    {reload.clip && <DrumReadout clip={reload.clip} style={valueEdge} />}
    <div className={s.row}>
      <div
        className={clsx(s.box, s[reload.state])}
        style={{ minWidth: rem(box.width), height: rem(box.height), paddingRight: rem(box.padding), paddingLeft: rem(box.padding) }}
      >
        <TabularText className={s.value} text={reload.value} />
      </div>
      <span className={s.leader} style={{ width: rem(leader) }} />
    </div>
    {reload.full && <TabularText className={s.full} style={valueEdge} text={reload.full} />}
  </div>
);
