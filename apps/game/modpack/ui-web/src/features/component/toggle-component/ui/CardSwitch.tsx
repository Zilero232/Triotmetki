import { useT } from '@/entities/window/window-state';
import { Toggle } from '@/ui-kit';

import type { CardSwitchProps } from './CardSwitch.types';

import { useCardSwitch } from '../model/hooks';

import s from './CardSwitch.module.scss';

export const CardSwitch = ({ component }: CardSwitchProps) => {
  const t = useT();
  const cardSwitch = useCardSwitch(component);

  if (!component.switch) {
    return (
      <span className={s.switch}>
        {cardSwitch.owner && (
          <button className={s.owner} type='button' onClick={cardSwitch.owner.open} {...cardSwitch.owner.tip}>
            <span className={s.ownerLabel}>{t('switchPartOf')}</span>
            <span className={s.ownerTitle}>{cardSwitch.owner.title}</span>
          </button>
        )}
      </span>
    );
  }

  return (
    <span className={s.switch}>
      <span className={s.switchLabel}>{cardSwitch.label}</span>
      <Toggle label={component.title} on={component.switch.value} onToggle={cardSwitch.toggle} />
    </span>
  );
};
