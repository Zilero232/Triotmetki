import { PROMO_ICON, PROMO_MOCK } from '../../../../../config';

import s from './MockGear.module.scss';

export const MockGear = () => (
  <ul className={s.root}>
    {PROMO_MOCK.gear.equipment.map(({ key, icon: Icon, mark }) => (
      <li key={key} className={s.slot} data-mark={mark}>
        <Icon className={s.icon} size={PROMO_ICON.mockSide} />
      </li>
    ))}
  </ul>
);
