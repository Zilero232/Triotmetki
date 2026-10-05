import { Toggle } from '@/ui-kit';

import type { CardSwitchProps } from './CardSwitch.types';

import { useCardSwitch } from '../model/hooks';

import s from './CardSwitch.module.scss';

export const CardSwitch = ({ component }: CardSwitchProps) => {
  const cardSwitch = useCardSwitch(component);

  if (!component.switch) {
    return null;
  }

  return (
    <span className={s.switch}>
      <span className={s.switchLabel}>{cardSwitch.label}</span>
      <Toggle label={component.title} on={component.switch.value} onToggle={cardSwitch.toggle} />
    </span>
  );
};
